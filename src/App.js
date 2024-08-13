import React, { Component } from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Home from './Home';
import UserScan from './UserScan';
import UserAccount from './UserAccount';
import ItemScan from './ItemScan';
import Register from './Register';
import SettingsView from './SettingsView';

const Stack = createStackNavigator();

// Main Class
export default class App extends Component<Props> {

  render() {

    return (
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={Home} options={{ headerShown: false, animationEnabled: true, animationTypeForReplace: 'push' }} />
          <Stack.Screen name="UserScan" component={UserScan} options={{ headerShown: false, animationEnabled: true, animationTypeForReplace: 'push' }} />
          <Stack.Screen name="UserAccount" component={UserAccount} options={{ headerShown: false, animationEnabled: true, animationTypeForReplace: 'push' }} />
          <Stack.Screen name="ItemScan" component={ItemScan} options={{ headerShown: false, animationEnabled: true, animationTypeForReplace: 'pop' }} />
          <Stack.Screen name="Register" component={Register} options={{ headerShown: false, animationEnabled: true, animationTypeForReplace: 'pop' }} />
          <Stack.Screen name="SettingsView" component={SettingsView} options={{ headerShown: false, animationEnabled: true, animationTypeForReplace: 'pop' }} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

}