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
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';

// Main Class
export default class ItemScan extends Component<Props> {

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
                   currentItemBarcode: '',
                   userBarcode: this.props.route.params['userBarcode'],
                   userObj: [{firstName: ''}],
                   itemList: [] };

  }

  componentDidMount() {
    // Load initial records 
    this.fetchUser(this.state.userBarcode);
  }

  fetchUser = (userBarcode) => {
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

  runCheckOut = (currentItemBarcode) => {

    console.log("POST: " + JSON.stringify({
        "itemBarcode": this.state.currentItemBarcode,
        "userBarcode": this.state.userBarcode,
        "servicePointId": this.state.CIRC_SERVICEPOINT
      }));

    fetch(this.state.OKAPI_URL + "/circulation/check-out-by-barcode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-okapi-tenant": this.state.OKAPI_TENANT,
        "x-okapi-token": this.state.OKAPI_TOKEN
      },
      body: JSON.stringify({
        "itemBarcode": this.state.currentItemBarcode,
        "userBarcode": this.state.userBarcode,
        "servicePointId": this.state.CIRC_SERVICEPOINT
      })
    })
    .then((response) => response.json())
    .then((responseJson) => {
      console.log(responseJson);
      if (responseJson["errors"]) {
        this.setState({
          errorMsg: responseJson["errors"][0]["message"],
        });
        console.log(responseJson["errors"][0]["message"]);
      } else { // CHeckout Successful
        //state is immutable, so create a temp arry and add to it and then update the state.
        let tempList = this.state.itemList;
        tempList.push(responseJson);
        console.log("TempList:" + tempList);
        this.setState({ 
          itemList: tempList
        });

        //Clear input and set focus
        //this.currentItemBarcode.clear();
        //this.currentItemBarcode.focus();

      }
    })
    .catch((error) => {
      console.log("POST Error:" + error);
      this.setState({
          errorMsg: "Error: Unable to checkout item",
        });
    });

  }

  render() {

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

    console.log("Check Out Screen");

    return (
    <div className="App">
      <Container component="main" maxWidth="md">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >

          <Typography component="h1" variant="h3">

            Check Out For {this.state.userObj["firstName"]}
            
          </Typography>

          <Typography component="h1" variant="h6">
            Scan Item Barcode
          </Typography>

          {/*alertMessage*/}

          <Box component="form" noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="currentItemBarcode"
              label="Scan Item Barcode"
              name="currentItemBarcode"
              InputProps={{
                endAdornment: <InputAdornment position="end"><DocumentScannerIcon /></InputAdornment>,
              }}              
              autoComplete=""
              autoFocus
              onChange={(text) => this.setState({currentItemBarcode:text.target.value})}
            />

            <Button
              onClick={() => this.runCheckOut(this.state.currentItemBarcode)}
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}>
              Check Out
            </Button>

            <Box style={{flex:1}}>

              <List>
                {this.state.itemList.map((listItem, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <DoneIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={listItem['item']['title']} secondary={listItem['dueDate']} />
                  </ListItem>
                ))}
              </List>

            </Box>            

            <Button
              onClick={() => this.props.navigation.navigate('Home')}
              fullWidth
              variant="contained"
              size="large"              
              sx={{ mt: 3, mb: 2 }}>
              Finish
            </Button>
          </Box>
        </Box>
    </Container>
    </div>    
  );
}


}