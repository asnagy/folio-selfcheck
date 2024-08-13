import React, { Component } from 'react';
import { MMKV } from 'react-native-mmkv';
import uuid from 'react-native-uuid';

import './App.css';

import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';

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
                    userFirstName: '',
                    userLastName: '',
                    userPrefferedName: '',
                    userBirthDate: '',
                    userAddress1: '',
                    userAddress2: '',
                    userCity: '',
                    userState: '',
                    userZip: '',
                    fieldList: {
                      username: {label: "Username", required: true},
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

  registerNewUser = () => {
    let userId = uuid.v4();
    console.log("User Id: " + userId);

    fetch(this.state.OKAPI_URL + "/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-okapi-tenant": this.state.OKAPI_TENANT,
        "x-okapi-token": this.state.OKAPI_TOKEN
      },
      body: JSON.stringify({
        id: userId,
        username: this.state.userEmail,
        active: false,
        type: "patron",
        personal: {
          firstName: this.state.userFirstName,
          preferredFirstName: this.state.userPreferredName,
          lastName: this.state.userLastName,          
          email: this.state.userEmail
        }
      })      
    })
    .then((response) => response.json())
    .then((responseJson) => {
        console.log(responseJson);
        this.props.navigation.navigate('RegisterSuccess');
    })
    .catch((error) => {
      console.log("Fetch Error:" + error);
      this.setState({
          errorMsg: error.message,
        });
    });

  }


  render () {

  console.log(this.state.fieldList);

    if (this.state.errorMsg != "") {
      return (
        <div className="App">
          <Container component="main" maxWidth="md">
            <Alert severity="error">{this.state.errorMsg}</Alert>
          </Container>

          <Button
              onClick={() => this.props.navigation.navigate('Home')}
              fullWidth
              variant="contained"
              size="large"              
              sx={{ mt: 3, mb: 2 }}>
              Go Back
          </Button>

        </div>
      );
    }


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
              onChange={(text) => this.setState({userEmail:text.target.value})}
              margin="normal"
              required
              fullWidth
              id="userEmail"
              label="Email"
              name="userEmail"
              autoFocus
            />
            <TextField
              onChange={(text) => this.setState({userFirstName:text.target.value})}
              margin="normal"
              required
              fullWidth
              id="userFirstName"
              label="First Name"
              name="userFirstName"
            />
            <TextField
              onChange={(text) => this.setState({userLastName:text.target.value})}
              margin="normal"
              required
              fullWidth
              id="userLastName"
              label="Last Name"
              name="userLastName"
            />
            <TextField
              onChange={(text) => this.setState({userPreferredName:text.target.value})}
              margin="normal"
              fullWidth
              id="userPreferredName"
              label="Preferred Name"
              name="userPreferredName"
            />
            <TextField
              onChange={(text) => this.setState({userBirthDate:text.target.value})}            
              margin="normal"
              required
              fullWidth
              id="userBirthDate"
              label="Birth Date"
              name="userBirthDate"
            />
            <TextField
              onChange={(text) => this.setState({userAddress1:text.target.value})}            
              margin="normal"
              fullWidth
              id="userAddressLine1"
              label="Address"
              name="userAddressLine1"
            />
            <TextField
              onChange={(text) => this.setState({userAddress2:text.target.value})}            
              margin="normal"
              fullWidth
              id="userAddressLine2"
              label="Address"
              name="userAddressLine2"
            />
            <TextField
              onChange={(text) => this.setState({userCity:text.target.value})}            
              margin="normal"
              fullWidth
              id="userAddressCity"
              label="City"
              name="userAddressCity"
            />
            <TextField
              onChange={(text) => this.setState({userState:text.target.value})}            
              margin="normal"
              fullWidth
              id="userAddressState"
              label="State"
              name="userAddressState"
            />
            <TextField
              onChange={(text) => this.setState({userZip:text.target.value})}                        
              margin="normal"
              fullWidth
              id="userAddressZip"
              label="Zip Code"
              name="userAddressZip"
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