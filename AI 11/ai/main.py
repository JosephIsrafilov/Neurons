import traceback

import joblib
from fastapi import FastAPI, HTTPException
from pathlib import Path
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from pydantic import BaseModel

app = FastAPI(title="Price Prediction AI service")


MODEL_PATH = Path(__file__).parent /"models"/ "model_az.pkl"
DATA_PATH = Path(__file__).parent / "data" / "housing_az_sqm_azn.csv"

try:
    loaded = joblib.load(MODEL_PATH)
    if isinstance(loaded, dict) and 'pipeline' in loaded:
        BUNDLE = loaded
        PIPELINE = BUNDLE['pipeline']
        FEATURES = BUNDLE.get('feature_order', ["Bedrooms", "Bathrooms", "Sqm", "City"])
except Exception as e:
    print("Model could not be loaded")
    traceback.print_exc()
    BUNDLE = None
    PIPELINE = None
    FEATURES = ["Bedrooms", "Bathrooms", "Sqm", "City"]


class PredictIn(BaseModel):
    bedrooms: float
    bathrooms: float
    sqm: float
    city: str


def _train_pipeline_from_csv():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    if df.empty:
        raise ValueError("Dataset is empty, cannot train model")

    target_column = "PriceAZN"
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' missing in dataset")

    X = df.drop(columns=[target_column])
    y = df[target_column]

    numeric_features = X.select_dtypes(include=["number"]).columns.tolist()
    categorical_features = [col for col in X.columns if col not in numeric_features]

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ]
    )

    model = RandomForestRegressor(
        n_estimators=300,
        random_state=42,
        n_jobs=-1,
    )

    pipeline = Pipeline(
        steps=[
            ("prep", preprocessor),
            ("model", model),
        ]
    )
    pipeline.fit(X, y)

    bundle = {
        "pipeline": pipeline,
        "feature_order": list(X.columns),
    }
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)
    return bundle


@app.post("/predict")
async def predict(request: PredictIn):
    if PIPELINE is None:
        raise HTTPException(status_code=503, detail="Model could not be loaded")
    try:
        features = {
            "Bedrooms": [request.bedrooms],
            "Bathrooms": [request.bathrooms],
            "City": [request.city],
        }

        if "Sqm" in FEATURES:
            features["Sqm"] = [request.sqm]
        features_df = pd.DataFrame(features, columns=FEATURES)
        prediction = PIPELINE.predict(features_df)[0]
        return {"priceAZN": float(prediction)}
    except Exception as e:
        print(f"Error predicting price: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error predicting price: {e}")


@app.post("/retrain")
async def retrain():
    global BUNDLE, PIPELINE, FEATURES
    try:
        bundle = _train_pipeline_from_csv()
        BUNDLE = bundle
        PIPELINE = bundle["pipeline"]
        FEATURES = bundle.get("feature_order", ["Bedrooms", "Bathrooms", "Sqm", "City"])
        return {"message": "Model retrained successfully", "rows": len(pd.read_csv(DATA_PATH))}
    except Exception as e:
        print(f"Error during retrain: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retraining model: {e}")
