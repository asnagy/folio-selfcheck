import React, { Component } from 'react';

import './App.css';

import Button from '@mui/material/Button';
import Icon from '@mui/material/Icon';
import Avatar from '@mui/material/Avatar';
import DoneIcon from '@mui/icons-material/Done';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';

// Main Class
export default class RegisterSuccess extends Component<Props> {

  render () {

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
            Welcome to the Library
          </Typography>

          <Card variant="outlined" sx={{ margin: 5 }}>
            <Box sx={{ p: 2 }}>

              <Avatar sx={{ bgcolor: 'success.main' }}>
                <DoneIcon />
              </Avatar>

            </Box>

            <Divider />
      
            <Box sx={{ p: 2 }}>
            <Button
              onClick={() => this.props.navigation.navigate('Home')}
              fullWidth
              variant="contained"
              size="large"              
              sx={{ mt: 3, mb: 2 }}>
              FINISHED
            </Button>

            </Box>
          </Card> 

        </Box>
    </Container>
    </div>
    ); 
  }

}