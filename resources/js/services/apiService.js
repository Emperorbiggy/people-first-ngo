import axios from 'axios';

export async function getCountries() {
    const res = await axios.get(route('geo.countries'));
    return res.data;
}

export async function getStates(countryId) {
    const res = await axios.get(route('geo.states', { country: countryId }));
    return res.data;
}

export async function previewGeoImport(stateId, file) {
    const form = new FormData();
    form.append('state_id', stateId);
    form.append('file', file);
    const res = await axios.post(route('geo.import.preview'), form);
    return res.data;
}

export async function importGeoData(stateId, file) {
    const form = new FormData();
    form.append('state_id', stateId);
    form.append('file', file);
    const res = await axios.post(route('geo.import.do'), form);
    return res.data;
}
