import React, { Component } from 'react';

import './App.css';

import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import InputAdornment from '@mui/material/InputAdornment';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';

// Main Class
export default class UserScan extends Component<Props> {

  constructor(props) {
    super(props);
    
    // Define State Variables
    this.state = { userBarcode: '' };
  }

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
            Scan your ID Card
          </Typography>

          <Box component="form" noValidate>
            <TextField
              onChange={(text) => this.setState({userBarcode:text.target.value})}
              margin="normal"
              required
              fullWidth
              id="userBarcode"
              label="Scan ID Card"
              name="userBarcode"
              InputProps={{
                endAdornment: <InputAdornment position="end"><DocumentScannerIcon /></InputAdornment>,
              }}
              autoComplete=""
              autoFocus
            />

            <Button
              onClick={() => this.props.navigation.navigate(this.props.route.params['followAction'], {userBarcode:this.state.userBarcode})}
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