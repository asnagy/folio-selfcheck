import React, { Component } from 'react';
import { MMKV } from 'react-native-mmkv';

import './App.css';

import Button from '@mui/material/Button';
import SettingsIcon from '@mui/icons-material/Settings';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';

// Main Class
export default class Home extends Component<Props> {

  render () {

    // Pull config data from local storage
    const storage = new MMKV();

    const showNewAccount = storage.getString('newAccountEnable') === 'true' ? true : false;

    return (
    <div className="App">
      <Container component="main" sx={{ backgroundImage: 'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))', backgroundRepeat: 'no-repeat' }}>
        <CssBaseline />
        <Box sx={{ marginTop: 8 }}>

          <Card variant="outlined" maxWidth="md" sx={{ margin: 5, padding: 5, flexDirection: 'column', alignItems: 'center', boxShadow: 'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px' }}>
            <Box sx={{ p: 3 }}>

              <Typography component="h1" variant="h3">
                Library Self Check Out
              </Typography>

                <Button
                  onClick={() => this.props.navigation.navigate('UserScan', {'followAction': 'ItemScan'})}
                  fullWidth
                  variant="contained"
                  size="large"              
                  style={{padding:"40px 0px"}}
                  sx={{ mt: 3, mb: 2 }}>
                  Start New Check Out
                </Button>

                { /*
                <Button
                  onClick={() => this.props.navigation.navigate('UserScan', {'followAction': 'UserAccount'})}
                  fullWidth
                  variant="contained"
                  size="medium"              
                  sx={{ mt: 3, mb: 2 }}>
                  Renew A Checkout
                </Button>
                */ }

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

          <BottomNavigation sx={{ bottom: 0, width: 1.0 }}
            onChange={(value, newValue) => {
              this.props.navigation.navigate('SettingsView');
            }}>
            <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
          </BottomNavigation>

        </Box>
      </Container>
    </div>
    ); 
  }

}