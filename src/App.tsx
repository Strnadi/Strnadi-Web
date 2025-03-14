import { Route, Routes, useLocation } from 'react-router';
import Navbar from '@/components/navbar/navbar';
import Map from '@/components/map';
import MyRecordings from '@/screens/left/my-recordings';
import Text from '@/components/text/text';
import RecordingDetail from '@/screens/left/recording-detail';
import Profile from '@/screens/left/profile';
import Login from '@/screens/popup/login';
import AddRecording from '@/screens/center/add-recording';
import Register from './screens/popup/register';
import PopupText from './components/text/text-popup';
import NotFound from './components/not-found';
import PopupLayout from './layouts/layout-popup';
import MapOptions from './screens/popup/map-options';
import MapLegend from './screens/popup/map-legend';

function App() {

  const location = useLocation();

  return (
    <div>
      { /* Navbar */ }
      <div className="fixed w-full z-[calc(1e9)] drop-shadow-xl">
        <Navbar />
      </div>

      { /* Background map */ }
      <div className='w-dvw h-dvh'>
        <Map />
      </div>

      { /* Left subwindow */ }
      { (location.pathname && location.pathname !== '/') &&
        <Routes>
          <Route path="account">
            <Route index element={<Profile />} />
            <Route path="my-recordings" element={<MyRecordings />} />
            <Route path="my-recordings/:id" element={<RecordingDetail />} />
          </Route>

          <Route path="auth">
            <Route path="login" element={<Login />} />
            <Route path="register">
              <Route index element={<Register />} />
              <Route path=":step" element={<Register />} />
            </Route>
          </Route>

          <Route path="application" element={<PopupText component="application" />} />
          { ["about-project", "about-bird", "how-to-record", "podminky-pouzivani", "ochrana-osobnich-udaju"].map((component) => (
            <Route
              key={component}
              path={component}
              element={<Text component={component} />}
            />
          )) }

          <Route path="recordings">
            <Route path=":id" element={<RecordingDetail />} />
          </Route>

          <Route path="add-recording" element={<AddRecording />} />

          <Route path="map-options" element={<MapOptions />} />
          <Route path="map-legend" element={<MapLegend />} />

          <Route path='*' element={<PopupLayout><NotFound /></PopupLayout>} />

        </Routes>
      }

    </div>
  );
}

export default App;
