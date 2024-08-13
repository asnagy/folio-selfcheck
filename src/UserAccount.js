import React, { Component } from 'react';
import { MMKV } from 'react-native-mmkv';

import './App.css';

import DoneIcon from '@mui/icons-material/Done';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

// Main Class
export default class UserAccount extends Component<Props> {

  constructor(props) {
    super(props);
    
    // Pull config data from local storage
    const storage = new MMKV();
    
    // Define State Variables
    this.state = { errorMsg: '',
                   OKAPI_URL: storage.getString('okapiUrl'),
                   OKAPI_TENANT: storage.getString('okapiTenant'),
                   OKAPI_TOKEN: storage.getString('okapiToken'),
                   userBarcode: this.props.route.params['userBarcode'],
                   userObj: [],
                   activeItems: [] };
  }

  componentDidMount() {
    // Load initial records 
    this.fetchUser(this.state.userBarcode);
  }

  fetchUser = (userBarcode) => {
    let userObj = '';
    let queryParams = "/users?query=barcode==" + userBarcode

    console.log("Fetch User: " + this.state.OKAPI_URL + queryParams);

    fetch(this.state.OKAPI_URL + queryParams, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-okapi-tenant": this.state.OKAPI_TENANT,
        "x-okapi-token": this.state.OKAPI_TOKEN
      } 
    })
    .then((response) => response.json())
    .then((responseJson) => {
      userObj = responseJson.users[0];
      console.log(userObj);
      this.setState({userObj: userObj});

      //fetch(this.state.OKAPI_URL + '/patron/account/' + userObj.id, {
      fetch(this.state.OKAPI_URL + '/circulation/loans?query=userId==' + userObj.id + ' and status.name==Open', {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-okapi-tenant": this.state.OKAPI_TENANT,
        "x-okapi-token": this.state.OKAPI_TOKEN
        } 
      })
      .then((response) => response.json())
      .then((responseJson) => {
        console.log("Loans Data");
        console.log(responseJson.loans);
        this.setState({activeItems: responseJson.loans});
      })
      .catch((error) => {
        console.log("Fetch Error:" + error);
        this.setState({
          //errorMsg: "Error: Unknown User",
          errorMsg: error.message,
        });
      });

      this.setState({userObj: userObj});
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

    console.log("User Account Screen");

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
            My Account
          </Typography>

      <Card variant="outlined" sx={{ margin: 5 }}>
        <Box sx={{ p: 2 }}>
          <Typography gutterBottom variant="h5">
            {this.state.userObj['firstName']} {this.state.userObj['lastName']}
          </Typography>
          <Typography gutterBottom variant="h6">
            {this.state.userObj['email']}
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Typography gutterBottom variant="h6">
            Checked Out Items
          </Typography>

              <List>
                {this.state.activeItems.map((listItem, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={listItem['item']['title']} secondary={listItem['dueDate']} />
                    <Button
                      onClick={() => this.props.navigation.navigate('Home')}
                      variant="contained"
                      size="large"              
                      sx={{ mt: 3, mb: 2 }}>
                        Renew
                    </Button>
                  </ListItem>
                ))}
              </List>

        </Box>              
      </Card>


            <Button
              onClick={() => this.props.navigation.navigate('Home')}
              fullWidth
              variant="outlined"
              size="large"              
              sx={{ mt: 3, mb: 2 }}>
              Cancel
            </Button>

          </Box>
    </Container>
    </div>

  );
}


}