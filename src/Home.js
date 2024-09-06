import React, { Component } from 'react';
import { MMKV } from 'react-native-mmkv';

import './App.css';

import Button from '@mui/material/Button';
import Icon from '@mui/material/Icon';
import SettingsIcon from '@mui/icons-material/Settings';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

// Main Class
export default class Home extends Component<Props> {

  render () {

    // Pull config data from local storage
    const storage = new MMKV();

    const showNewAccount = storage.getString('newAccountEnable') === 'true' ? true : false;

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
            Library Self Check Out
          </Typography>
          <Typography component="h1" variant="h6">
            Choose an option below to begin
          </Typography>

          <Card variant="outlined" sx={{ margin: 5 }}>
            <Box sx={{ p: 2 }}>

                <Button
                  onClick={() => this.props.navigation.navigate('UserScan', {'followAction': 'ItemScan'})}
                  fullWidth
                  variant="contained"
                  size="large"              
                  style={{padding:"40px 0px"}}
                  sx={{ mt: 3, mb: 2 }}>
                  Start New Check Out
                </Button>

                <Button
                  onClick={() => this.props.navigation.navigate('UserScan', {'followAction': 'UserAccount'})}
                  fullWidth
                  variant="contained"
                  size="medium"              
                  sx={{ mt: 3, mb: 2 }}>
                  Renew A Checkout
                </Button>

            </Box>

            <Divider />
      
            <Box sx={{ p: 2 }}>
              <Typography gutterBottom variant="h6">
                My Account Options
              </Typography>
              
              <Stack direction="row" spacing={1}>

            <Button
              onClick={() => this.props.navigation.navigate('UserScan', {'followAction': 'UserAccount'})}
              fullWidth
              variant="contained"
              size="large"              
              sx={{ mt: 3, mb: 2 }}>
              View My Account
            </Button>

            {showNewAccount === true ? (
            <Button
              onClick={() => this.props.navigation.navigate('Register')}
              fullWidth
              variant="contained"
              size="large"              
              sx={{ mt: 3, mb: 2 }}>
              New Library Card
            </Button>
            ) : null }

              </Stack>
            </Box>
          </Card> 

            <Button
              style={{padding:"10px 0px"}}
              onClick={() => this.props.navigation.navigate('SettingsView')}
              variant="outlined">
              <Icon><SettingsIcon /></Icon>
            </Button>

        </Box>
    </Container>
    </div>
    ); 
  }

}