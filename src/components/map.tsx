import {useGeolocation} from 'react-use';
import { MapContainer, TileLayer, Marker, Popup, LayerGroup, useMap } from 'react-leaflet';
import { icon, Icon, LatLng, Map } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import OptionsIcon from '@/assets/icon-options.svg'
import InfoIcon from '@/assets/icon-info.svg'
import { useMapState } from '@/store';

const env = import.meta.env;

const icons = {
  BC: new Icon({
    iconUrl: '/dialects/dialect-bc.svg',
    iconSize: [16, 16]
  }),

  BE: new Icon({
    iconUrl: '/dialects/dialect-be.svg',
    iconSize: [16, 16]
  }),

  XB: new Icon({
    iconUrl: '/dialects/dialect-xb.svg',
    iconSize: [16, 16]
  }),

  BhBl: new Icon({
    iconUrl: '/dialects/dialect-bhbl.svg',
    iconSize: [16, 16]
  }),

  BlBH: new Icon({
    iconUrl: '/dialects/dialect-blbh.svg',
    iconSize: [16, 16]
  }),

  Other: new Icon({
    iconUrl: '/dialects/dialect-other.svg',
    iconSize: [16, 16]
  }),

  NotSure: new Icon({
    iconUrl: '/dialects/dialect-notsure.svg',
    iconSize: [16, 16]
  })
};

function Map() {
  const map = useRef<Map>(null);

  const selectedLocation = useMapState(state => state.selectedLocation);
  const setSelectedLocation = useMapState(state => state.setSelectedLocation);

  const [mode, setMode] = useState<"aerial" | "basic" | "outdoor">("basic");

  const {
    loading: location_loading,
    accuracy: location_accuracy,
    latitude: location_latitude,
    longitude: location_longitude,
    heading: location_heading
  } = useGeolocation();

  const MapEvents = () => {
    const leafletMap = useMap();

    useEffect(() => {
      leafletMap.on("click", (event) => {
        setSelectedLocation(event.latlng);
      });

      return () => {
        leafletMap.off("click");
      };
    }, [leafletMap]);

    return null;
  };

  return (
    <MapContainer
      ref={map}
      zoom={8}
      center={[50, 15]}
      scrollWheelZoom={true}
      style={{ height: '100vh', width: '100%' }}
      zoomControl={false}
    >
      <MapEvents />
      <TileLayer
        attribution='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
        url={`https://api.mapy.cz/v1/maptiles/${mode}/256/{z}/{x}/{y}?apikey=${env.VITE_MAPYCZ_API_KEY}`}
        zIndex={1}
      />

      { mode == "aerial" &&
        <TileLayer
          attribution='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
          url={`https://api.mapy.cz/v1/maptiles/names-overlay/256/{z}/{x}/{y}?apikey=${env.VITE_MAPYCZ_API_KEY}`}
          zIndex={2}
        />
      }

      {(!location_loading && location_latitude && location_longitude) && (
        <Marker position={[location_latitude, location_longitude]} icon={icons.Other}>
          <Popup>
            Your current location
          </Popup>
        </Marker>
      )}

      { selectedLocation &&
        <Marker position={selectedLocation} icon={icons.XB}>
          <Popup>
            Označená poloha
          </Popup>
        </Marker>
      }

      <button className='drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white absolute left-0 bottom-0 z-[calc(1e10)]'><img src={InfoIcon} /></button>
      <button className='drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white absolute right-0 bottom-0 z-[calc(1e10)]'><img src={OptionsIcon} /></button>
      <button className='drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white absolute right-0 bottom-0 z-[calc(1e10)]'><img src={OptionsIcon} /></button>
    </MapContainer>
  );
}

export default Map;
