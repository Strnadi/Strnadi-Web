import axios from 'axios';

export const getGeocode = async (
  name: string,
  type: string[],
  limit = 5,
  locality = 'cz',
  lng = 'cs'
): Promise<any> => {
  const response = await axios.get(
    `/map/v1/geocode` +
      `?query=${encodeURIComponent(name)}` +
      `&limit=${limit}` +
      `&lang=${lng}` +
      `&locality=${locality}` +
      `&type=${type.join(',')}`
  );
  return response.data.items;
};

export const getGeocodeAutocomplete = async (
  text: string,
  type: string[],
  limit = 5,
  locality = 'cz',
  lng = 'cs'
): Promise<any> => {
  const response = await axios.get(
    `/map/v1/geocode` +
      `?query=${encodeURIComponent(text)}` +
      `&limit=${limit}` +
      `&lang=${lng}` +
      `&locality=${locality}` +
      `&type=${type.join(',')}`
  );
  return response.data.items;
};

export const getReverseGeocode = async (
  lat: number,
  lon: number,
  lng = 'cs'
): Promise<any> => {
  const response = await axios.get(
    `/map/v1/rgeocode?lat=${lat}&lon=${lon}&lang=${lng}`
  );
  return response.data;
};
