# Self Service mobile app for FOLIO LSP

A react native project to provide a native app designed for a tablet device to provide Self Service tools for libraries using the FOLIO LSP (https://folio.org).

## Introduction

## Configuring the App

1. The first step to setup the FOLIO Self Service app is to establish an API user in FOLIO if you have not already created an API user account. This will allow you to ensure all API based actions are recorded as such. 
2. Create a service point that will reflect the Self Service App location. For example, if you have a location in FOLIO for "first floor", you might create an affiliated service point called "self service app" attached to this location. Once the service point is created, please note the ID number of the service point. This will be identified in the URL of the service point. You need to note the Serivce Point ID, not the name nor code of the service point.
3. Once the app is loaded on the mobile device and the app is started, the first thing you will need to do in order to setup the app is to touch the Settings icon at the bottom of the screen. Here you will need to enter the following:

### OKAPI URL

Settings > Developer > Okapi console > Configuration > URL

### OKAPI Tenant

Settings > Developer > Okapi console > Configuration > Tenant

### Service Point ID

Settings > Tenant > Service points
Select the service point that you want to affiliate the Self Service app with. Once you have selected it, you will need to record the ID from the URL.
https://myfoliourl/settings/tenant-settings/servicePoints/<ID>

### FOLIO API Username

The username of your API user.

### FOLIO API Password

The password of your API user.

## Developers: Running the react native app locally

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
