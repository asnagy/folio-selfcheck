import React, { Component } from 'react';
import { MMKV } from 'react-native-mmkv';

import './App.css';

import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

// Main Class
export default class SettingsView extends Component<Props> {

  constructor(props) {
    super(props);

    // Define State Variables
    this.state = { okapiUrl: '',
                    okapiTenant: '',
                    servicePointId: '',                    
                    apiUsername: '',
                    apiPassword: '',                    
                 };
  }

  setStorage = () => {
    console.log('POST: ' + this.state.okapiUrl + '/authn/login');

    // If able to fetch a token, save configuration data to local storage

    fetch(this.state.okapiUrl + '/authn/login', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-okapi-tenant": this.state.okapiTenant,
      },
      body: JSON.stringify({
        "username": this.state.apiUsername,
        "password": this.state.apiPassword,
      })
    })
    .then((response) => response.json())
    .then((responseJson) => {
        console.log("Token Request Response");
        console.log(responseJson);

        const storage = new MMKV();
        storage.set('okapiUrl', this.state.okapiUrl);
        storage.set('okapiTenant', this.state.okapiTenant);
        storage.set('okapiToken', responseJson.okapiToken);
        storage.set('servicePointId', this.state.servicePointId);

    })
    .catch((error) => {
      console.log("Fetch Error:" + error);
      this.setState({
          errorMsg: "Error: Invalid Credentials for Tenant " + this.state.okapiTenant,
        });
    });

  }

  render () {
    // Pull config data from local storage
    const storage = new MMKV();

    return (
    <div className="App">
      <Container component="main" maxWidth="md">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            flexDirection: 'column',
            alignItems: 'center',
          }}>

          <Typography component="h1" variant="h3">
            Self Check App Settings
          </Typography>

          <Box component="form" noValidate>
            <TextField
              onChange={(text) => this.setState({okapiUrl:text.target.value})}
              margin="normal"
              required
              fullWidth
              id="okapiUrl"
              label="OKAPI URL"
              name="okapiUrl"
              autoFocus
              defaultValue={storage.getString('okapiUrl')}
            />

            <TextField
              onChange={(text) => this.setState({okapiTenant:text.target.value})}
              margin="normal"
              required
              fullWidth
              id="okapiTenant"
              label="OKAPI Tenant"
              name="okapiTenant"
              defaultValue={storage.getString('okapiTenant')}
            />

            <TextField
              onChange={(text) => this.setState({servicePointId:text.target.value})}
              margin="normal"
              required
              fullWidth
              id="servicePointId"
              label="Service Point ID"
              name="servicePointId"
              defaultValue={storage.getString('servicePointId')}
            />

            <TextField
              onChange={(text) => this.setState({apiUsername:text.target.value})}
              margin="normal"
              required
              fullWidth
              id="apiUsername"
              label="FOLIO API User Username"
              name="apiUsername"
            />

            <TextField
              onChange={(text) => this.setState({apiPassword:text.target.value})}
              margin="normal"
              required
              fullWidth
              id="apiPassword"
              label="FOLIO API User Password"
              name="apiPassword"
            />

            <Button
              onClick={() => this.setStorage()}
              fullWidth
              variant="contained"
              size="large"              
              sx={{ mt: 3, mb: 2 }}>
              Save
            </Button>

            <Button
              onClick={() => this.props.navigation.navigate('Home')}
              fullWidth
              variant="outlined"
              size="large"              
              sx={{ mt: 3, mb: 2 }}>
              Cancel
            </Button>

          </Box>
        </Box>
    </Container>
    </div>

  );
}

}