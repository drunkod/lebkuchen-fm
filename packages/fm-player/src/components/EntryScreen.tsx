import * as React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import App from './App';
import SplashScreen from './SplashScreen';
import XSoundUploadForm from './XSoundUploadForm';

function EntryScreen() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <SplashScreen />
        </Route>
        <Route path="/upload">
          <XSoundUploadForm />
        </Route>
        <Route path="/player">
          <App />
        </Route>
      </Switch>
    </Router>
  );
}
export default EntryScreen;
