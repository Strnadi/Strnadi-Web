import { useGeolocation } from "react-use";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayerGroup,
  useMap,
  TileLayerProps,
} from "react-leaflet";
import { icon, Icon, LatLng, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import OptionsIcon from "@/assets/icon-options.svg";
import InfoIcon from "@/assets/icon-info.svg";
import { useAccount, useMapState } from "@/state/store";
import { CachedTileLayer } from "@yaga/leaflet-cached-tile-layer";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getFilteredRecordings, getRecordings } from "@/api/recording";
import { RecordingModel, RecordingPartModel } from "@/api/types/recording";

const env = import.meta.env;

const icons = {
  BC: new Icon({
    iconUrl: "/dialects/dialect-bc.svg",
    iconSize: [24, 24],
  }),

  BE: new Icon({
    iconUrl: "/dialects/dialect-be.svg",
    iconSize: [24, 24],
  }),

  XB: new Icon({
    iconUrl: "/dialects/dialect-xb.svg",
    iconSize: [24, 24],
  }),

  BhBl: new Icon({
    iconUrl: "/dialects/dialect-bhbl.svg",
    iconSize: [24, 24],
  }),

  BlBH: new Icon({
    iconUrl: "/dialects/dialect-blbh.svg",
    iconSize: [24, 24],
  }),

  Other: new Icon({
    iconUrl: "/dialects/dialect-other.svg",
    iconSize: [24, 24],
  }),

  NotSure: new Icon({
    iconUrl: "/dialects/dialect-notsure.svg",
    iconSize: [24, 24],
  }),

  Marker: new Icon({
    iconUrl: "/marker.svg",
    iconSize: [48, 48]
  }),
};

function Map() {
  const map = useRef<LeafletMap>(null);

  const navigate = useNavigate();

  const selectedLocation = useMapState((state) => state.selectedLocation);
  const setSelectedLocation = useMapState((state) => state.setSelectedLocation);

  const mode = useMapState((state) => state.mode);

  const recordings = useQuery({
    queryKey: ["all-recordings"],
    queryFn: getRecordings,
  });

  const {
    loading: location_loading,
    accuracy: location_accuracy,
    latitude: location_latitude,
    longitude: location_longitude,
    heading: location_heading,
  } = useGeolocation();

  const MapEvents = () => {
    const leafletMap = useMap();

    const handleMapClick = useCallback(
      (event) => {
        setSelectedLocation(event.latlng);
      },
      []
    );

    useEffect(() => {
      leafletMap.on("click", handleMapClick);

      return () => {
        leafletMap.off("click", handleMapClick);
      };
    }, [leafletMap, handleMapClick]);

    return null;
  };

  const CachedMapLayer = (props: TileLayerProps) => {
    const leafletMap = useMap();

    useEffect(() => {
      // Create the layer
      const tileLayer = new CachedTileLayer(props.url, {
        ...props,
        databaseName: "tile-cache-data",
        databaseVersion: 1,
        objectStoreName: "OSM",
        crawlDelay: 0,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      // Add it to the map
      tileLayer.addTo(leafletMap);

      // Clean up on unmount or when props change
      return () => {
        if (leafletMap && tileLayer) {
          leafletMap.removeLayer(tileLayer);
        }
      };
    }, [leafletMap, props.url, props.zIndex]);

    return null;
  };

  // Stable map layers that don't need to re-render when location changes
  const MapLayers = useCallback(() => {
    return (
      <>
        <TileLayer url="/map-loading.png" zIndex={0} />

        <CachedMapLayer
          attribution='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
          url={`https://api.mapy.cz/v1/maptiles/${mode}/256/{z}/{x}/{y}?apikey=${env.VITE_MAPYCZ_API_KEY}`}
          zIndex={1}
        />

        {mode === "aerial" && (
          <CachedMapLayer
            attribution='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
            url={`https://api.mapy.cz/v1/maptiles/names-overlay/256/{z}/{x}/{y}?apikey=${env.VITE_MAPYCZ_API_KEY}`}
            zIndex={2}
          />
        )}
      </>
    );
  }, [mode]);

  // Dynamic markers that depend on location state
  const MapMarkers = useCallback(() => {
    return (
      <>
        {!location_loading && location_latitude && location_longitude && (
          <Marker
            position={[location_latitude, location_longitude]}
            icon={icons.Other}
          >
            <Popup>Your current location</Popup>
          </Marker>
        )}

        {selectedLocation && (
          <Marker position={selectedLocation} icon={icons.Marker}>
            <Popup>Označená poloha</Popup>
          </Marker>
        )}

        {recordings.data?.map((recording: RecordingModel) =>
          recording.parts?.map((part: RecordingPartModel) =>
            <Marker
              key={part.id}
              position={{
                // Average the recording position
                lat: (part.gpsLatitudeStart + part.gpsLatitudeEnd) / 2,
                lng: (part.gpsLongitudeStart + part.gpsLongitudeEnd) / 2,
              }}
              icon={icons.BC}
              eventHandlers={{
                click: () => {
                  navigate(
                    `/recordings/${recording.id}`,
                  )
                },
              }}
            />
          )
        )}
      </>
    );
  }, [
    location_loading,
    location_latitude,
    location_longitude,
    selectedLocation,
    recordings.data
  ]);

  return (
    <MapContainer
      ref={map}
      zoom={10}
      center={[50, 15]}
      scrollWheelZoom={true}
      style={{ height: "100vh", width: "100%" }}
      zoomControl={false}
    >
      <MapEvents />
      <MapLayers />
      <MapMarkers />

      <Link
        to={"/map-legend"}
        className="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white absolute right-0 bottom-18 z-[calc(1e10)]"
      >
        <img src={InfoIcon} />
      </Link>

      <Link
        to={"/map-options"}
        className="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white absolute right-0 bottom-0 z-[calc(1e10)]"
      >
        <img src={OptionsIcon} />
      </Link>
    </MapContainer>
  );
}

export default Map;
