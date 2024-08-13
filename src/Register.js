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
export default class Register extends Component<Props> {

  constructor(props) {
    super(props);

    // Pull config data from local storage
    const storage = new MMKV();

    // Define State Variables
    this.state = { errorMsg: '',
                   OKAPI_URL: storage.getString('okapiUrl'),
                   OKAPI_TENANT: storage.getString('okapiTenant'),
                   OKAPI_TOKEN: storage.getString('okapiToken'),
                   CIRC_SERVICEPOINT: storage.getString('servicePointId'),
                   fieldList: { username: {label: "Username", required: true},
                                userFirstName: {label: "First Name", required: true},
                                userLastName: {label: "Last Name", required: true},
                                userPreferredName: {label: "Preferred Name", required: false},
                                userBirthDate: {label: "Date of Birth", required: true},
                                userAddress1: {label: "Address Line 1", required: true},
                                userAddress2: {label: "Address Line 2", required: false},
                                userCity: {label: "City", required: true},
                                userState: {label: "State", required: true},
                                userZip: {label: "Zip Code", required: true},
                                userEmail: {label: "Email", required: true},
                                userPhone: {label: "Phone", required: false}
                              }
                };    
  }

  registerNewUser = (userObj) => {

    fetch(this.state.OKAPI_URL + "/user/new", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-okapi-tenant": this.state.OKAPI_TENANT,
        "x-okapi-token": this.state.OKAPI_TOKEN
      },
      body: JSON.stringify({
        userFirstName: this.state.userObj['userFirstName'],
        userPreferredName: this.state.userObj['userPreferredName'],
        userLastName: this.state.userObj['userLastName'],
        userEmail: this.state.userObj['userEmail']                
      })      
    })
    .then((response) => response.json())
    .then((responseJson) => {
        console.log(responseJson.users[0]["personal"]);
        this.setState({userObj: responseJson.users[0]["personal"]});
    })
    .catch((error) => {
      console.log("Fetch Error:" + error);
      this.setState({
          errorMsg: "Error: Unknown User",
          //errorMsg: error.message,
        });
    });

  }


  render () {

  console.log(this.state.fieldList);

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
            Register New Library Card
          </Typography>

          <Box component="form" noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="userFirstName"
              label="First Name"
              name="userFirstName"
              autoComplete=""
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="userLastName"
              label="Last Name"
              name="userLastName"
              autoComplete=""
              autoFocus
            />
            <TextField
              margin="normal"
              fullWidth
              id="userPreferredName"
              label="Preferred Name"
              name="userPreferredName"
              autoComplete=""
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="userBirthDate"
              label="Birth Date"
              name="userBirthDate"
              autoComplete=""
              autoFocus
            />
            <TextField
              margin="normal"
              fullWidth
              id="userAddressLine1"
              label="Address"
              name="userAddressLine1"
              autoComplete=""
              autoFocus
            />
            <TextField
              margin="normal"
              fullWidth
              id="userAddressLine2"
              label="Address"
              name="userAddressLine2"
              autoComplete=""
              autoFocus
            />
            <TextField
              margin="normal"
              fullWidth
              id="userAddressCity"
              label="City"
              name="userAddressCity"
              autoComplete=""
              autoFocus
            />
            <TextField
              margin="normal"
              fullWidth
              id="userAddressState"
              label="State"
              name="userAddressState"
              autoComplete=""
              autoFocus
            />
            <TextField
              margin="normal"
              fullWidth
              id="userAddressZip"
              label="Zip Code"
              name="userAddressZip"
              autoComplete=""
              autoFocus
            />

            <Button
              onClick={() => this.registerNewUser()}
              fullWidth
              variant="contained"
              size="large"              
              sx={{ mt: 3, mb: 2 }}>
              Next
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