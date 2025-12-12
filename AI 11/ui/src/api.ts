const API = 'http://localhost:5163'

export type PredictIn = {
    bedrooms: number;
    bathrooms: number;
    sqm: number;
    city: string;
}

export type ApartmentIn = PredictIn & {
    priceAZN: number;
}

export async function predict(data: PredictIn) {
    const r = await fetch(`${API}/api/AI/predict`,
        {
            method: 'POST',
        headers:
            {
                'Content-Type':'application/json'
            },
            body: JSON.stringify(data)
        });
    if (!r.ok) {
        throw new Error(r.statusText);
    }
    return r.json() as Promise<{priceAZN: number}>;
}

export async function addApartment(data: ApartmentIn) {
    const r = await fetch(`${API}/api/AI/apartments`,
        {
            method: 'POST',
            headers:
                {
                    'Content-Type':'application/json'
                },
            body: JSON.stringify(data)
        });

    if (!r.ok) {
        const detail = await r.text();
        throw new Error(detail || r.statusText);
    }
    return r.json() as Promise<{message: string}>;
}
