# Magnificent Escape Action

Magnificent Escape is a game for the Google Assistant. The game is implemented as an [Action](https://developers.google.com/actions/) and hosted on [App Engine](https://cloud.google.com/appengine/). The games' Natural Language Understanding is implemented with [Dialogflow](https://dialogflow.com/).

You can read more about the design of the Action on [Medium](https://medium.com/google-developers/the-magnificent-escape-action-97b1bc03942e).

[Play the game](https://assistant.google.com/services/invoke/uid/00000047ab5fbcf8) on any Google Assistant device.

## Setup Instructions

Firstly, deploy the fulfillment logic for the game on App Engine. Then create a Dialogflow agent that is configured to use the fulfillment.

### Prerequisites
1. Node.js and NPM
    + We recommend installing using [nvm for Linux/Mac](https://github.com/creationix/nvm) and [nvm-windows for Windows](https://github.com/coreybutler/nvm-windows)
1. Create a project in the [Google Cloud console](https://console.cloud.google.com/).
1. Install the [gcloud](https://cloud.google.com/sdk/) command line utility.

### How to deploy
The game is implemented in [Node.js](https://nodejs.org/en/).

On your local machine, in the directory you downloaded the project source code, run `npm install`.

Edit the `.env` and `app-production.yaml` files to use your own project ID.

To deploy the app to App Engine, use the gcloud command line utility:
```
gcloud config set project YOUR_PROJECT_ID
```
```
gcloud app deploy app-production.yaml
```

Now the app is hosted on a URL like: `https://YOUR_PROJECT_ID.appspot.com`

### Dialogflow Action
1. Use the [Actions on Google Console](https://console.actions.google.com) to import the project you created above and click **Import Project**.
1. Scroll down to the **More Options** section, and click on the **Conversational** card.
1. From the left navigation menu under **Build** > **Actions** > **Add Your First Action** > **Play game** > **GET STARTED IN DIALOGFLOW** (this will bring you to the Dialogflow console) > Select language and time zone > **CREATE**.
1. Click on the gear icon to see the project settings.
1. Select "Export and Import".
1. Select "Restore from zip". Follow the directions to restore from the DialogflowAgent.zip in this repo.
1. On the left navigation menu click on **Fulfillment**.
1. Enable the webhook option.
1. Enter your App Engine URL for the webhook URL.
1. Click **Save**.
1. Select **Integrations** from the left navigation menu and open the **Integration Settings** menu for Actions on Google.
1. Enable **Auto-preview changes** and Click **Test**. This will open the Actions on Google simulator.
1. Type `Talk to my test app` in the simulator, or say `OK Google, talk to my test app` to any Actions on Google enabled device signed into your developer account.

### Analytics
You can optionally add support for analytics by editing the `.env` and `app-production.yaml` files.

1. [Google Analytics](https://analytics.google.com/).
1. [Chatbase](https://chatbase.com/)

## References & Issues
+ Questions? Go to [StackOverflow](https://stackoverflow.com/questions/tagged/actions-on-google), [Assistant Developer Community on Reddit](https://www.reddit.com/r/GoogleAssistantDev/) or [Support](https://developers.google.com/actions/support/).
+ Actions on Google [Documentation](https://developers.google.com/actions/extending-the-assistant)
+ Actions on Google [Codelabs](https://codelabs.developers.google.com/?cat=Assistant)

## License
See LICENSE.
