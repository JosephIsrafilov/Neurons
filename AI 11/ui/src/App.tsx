import './App.css'
import {cities} from "./cities.ts";
import {type ChangeEvent, type FormEvent, useState} from "react";
import {addApartment, predict, type ApartmentIn, type PredictIn} from "./api.ts";

type Tab = 'predict' | 'add';

function App() {
    const [activeTab, setActiveTab] = useState<Tab>('predict');
    const[formData, setFormData] = useState<PredictIn>({
        bedrooms:0,
        bathrooms:0,
        sqm:0,
        city:''
    })
    const [apartmentData, setApartmentData] = useState<ApartmentIn>({
        priceAZN: 0,
        bedrooms: 0,
        bathrooms: 0,
        sqm: 0,
        city: ''
    })

    const [priceAZN, setPriceAZN] = useState<number | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const [saving, setSaving] = useState<boolean>(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveMessage, setSaveMessage] = useState<string | null>(null)

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        setError(null);
        setPriceAZN(null);
        setSaveError(null);
        setSaveMessage(null);
    }

    const handleChange
        = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>)=>{
        const{name, value} = e.target;
        setFormData(prev=>({
           ...prev,
           [name]:name ==='city'?value : Number(value)
        }))
    }

    const handleApartmentChange
        = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>)=>{
        const{name, value} = e.target;
        setApartmentData(prev=>({
            ...prev,
            [name]:name === 'city'?value : Number(value)
        }))
    }

    const handleSubmit
        = async (e:FormEvent)=>{
        e.preventDefault()
        setLoading(true)
        setError(null)
        setPriceAZN(null)

        try{
            const result = await predict(formData)
            setPriceAZN(result.priceAZN)
        }
        catch(err){
            setError(err instanceof Error? err.message : "An error occurred")
        }
        finally{
            setLoading(false)
        }
    }

    const handleApartmentSubmit
        = async (e: FormEvent)=>{
        e.preventDefault()
        setSaving(true)
        setSaveError(null)
        setSaveMessage(null)
        try{
            const result = await addApartment(apartmentData)
            setSaveMessage(result.message ?? "Apartment saved and retraining started")
        }catch (err){
            setSaveError(err instanceof Error? err.message : "An error occurred")
        }finally {
            setSaving(false)
        }
    }

    return (
        <div className="app">
            <div className="container">
                <h1>Price Prediction</h1>

                <div className="tabs">
                    <button
                        type="button"
                        className={`tab ${activeTab === 'predict' ? 'active' : ''}`}
                        onClick={() => handleTabChange('predict')}
                    >
                        Predict price
                    </button>
                    <button
                        type="button"
                        className={`tab ${activeTab === 'add' ? 'active' : ''}`}
                        onClick={() => handleTabChange('add')}
                    >
                        Add apartment
                    </button>
                </div>

                {activeTab === 'predict' ? (
                    <>
                        <form className="form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="bedrooms">Bedrooms: </label>
                                <input
                                    type="number"
                                    id="bedrooms"
                                    name="bedrooms"
                                    min="0"
                                    value={formData.bedrooms}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="bathrooms">Bathrooms: </label>
                                <input
                                    type="number"
                                    id="bathrooms"
                                    name="bathrooms"
                                    min="0"
                                    value={formData.bathrooms}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="sqm">Sqm: </label>
                                <input
                                    type="number"
                                    id="sqm"
                                    name="sqm"
                                    min="0"
                                    value={formData.sqm}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="city">City: </label>
                                <select name="city" id="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        required>
                                    <option value="">Select...</option>
                                    {
                                        cities.map(city => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>

                                        ))
                                    }
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="submit-button"
                                disabled={loading}>
                                {loading? "Predicting ...": "Predict Price"}
                            </button>
                        </form>

                        {error && <div className="error">{error}</div>}
                        {
                            priceAZN !== null &&
                            (
                                <div className="result">
                                    <h2>Predicted price: {Intl.NumberFormat('az-Az',
                                        {
                                            style: "currency",
                                            currency: "AZN",
                                        }).format(priceAZN)
                                    }</h2>
                                </div>
                            )
                        }
                    </>
                ):(
                    <>
                        <form className="form" onSubmit={handleApartmentSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="priceAZN">Price (AZN): </label>
                                    <input
                                        type="number"
                                        id="priceAZN"
                                        name="priceAZN"
                                        min="0"
                                        value={apartmentData.priceAZN}
                                        onChange={handleApartmentChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="sqm">Sqm: </label>
                                    <input
                                        type="number"
                                        id="sqm"
                                        name="sqm"
                                        min="0"
                                        value={apartmentData.sqm}
                                        onChange={handleApartmentChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="bedrooms-add">Bedrooms: </label>
                                    <input
                                        type="number"
                                        id="bedrooms-add"
                                        name="bedrooms"
                                        min="0"
                                        value={apartmentData.bedrooms}
                                        onChange={handleApartmentChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="bathrooms-add">Bathrooms: </label>
                                    <input
                                        type="number"
                                        id="bathrooms-add"
                                        name="bathrooms"
                                        min="0"
                                        value={apartmentData.bathrooms}
                                        onChange={handleApartmentChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="city-add">City: </label>
                                <select name="city"
                                        id="city-add"
                                        value={apartmentData.city}
                                        onChange={handleApartmentChange}
                                        required>
                                    <option value="">Select...</option>
                                    {
                                        cities.map(city => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>

                                        ))
                                    }
                                </select>
                            </div>

                            <p className="hint">После сохранения модель автоматически переобучится на обновленных данных.</p>

                            <button
                                type="submit"
                                className="submit-button"
                                disabled={saving}>
                                {saving? "Saving & retraining ..." : "Save apartment"}
                            </button>
                        </form>

                        {saveError && <div className="error">{saveError}</div>}
                        {saveMessage && <div className="result">
                            <h2>{saveMessage}</h2>
                        </div>}
                    </>
                )}
            </div>
        </div>
    )
}

export default App
