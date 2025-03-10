import { Route, Routes, useLocation } from 'react-router';
import Navbar from '@/components/navbar';
import Map from '@/components/map';
import MyRecordings from '@/screens/left/my-recordings';
import Text from '@/components/text';
import RecordingDetail from '@/screens/left/recording-detail';
import Profile from '@/screens/left/profile';
import Login from '@/screens/popup/login';
import AddRecording from '@/screens/center/add-recording';
import Register from './screens/popup/register';
import CenterText from './components/text-center';
import PopupText from './components/text-popup';
import NotFound from './components/not-found';
import PopupLayout from './layouts/layout-popup';
import MapOptions from './screens/popup/map-options';

function App() {

  const location = useLocation();

  return (
    <div>
      { /* Navbar */ }
      <div className="fixed w-full z-[calc(1e9)] drop-shadow-2xl">
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

          <Route path="application" element={<PopupText component="application" />} />
          <Route path="gdpr" element={<CenterText component="gdpr" />} />

          <Route path="auth">
            <Route path="login" element={<Login />} />
            <Route path="register">
              <Route index element={<Register />} />
              <Route path=":step" element={<Register />} />
            </Route>
          </Route>

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

          <Route path='*' element={<PopupLayout><NotFound /></PopupLayout>} />

        </Routes>
      }

    </div>
  );
}

export default App;
