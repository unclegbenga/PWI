# Connect PWI website forms

The destination sheet is already created: https://docs.google.com/spreadsheets/d/1HYj6NVoXOOhK41lCvF_jsdLu6XLzdy0xtOe3f5sWVdk/edit

1. Visit [Google Apps Script](https://script.new) while signed into the Google account that owns the sheet.
2. Replace the starter code with the contents of `Code.gs`, then save the project as `PWI registration endpoint`.
3. Select **Deploy → New deployment → Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Authorize the requested Google permissions, then deploy.
4. Copy the web-app URL that ends in `/exec` and send it here. It will be added to the landing page configuration.

The web app records registration-form entries in the spreadsheet. It also sends Contact-form enquiries to `Promisewesleyinitiative@gmail.com` from the Google account that deploys the script, with the visitor's email address set as Reply-To.

Do not store passwords, identity documents, financial details, or other sensitive information in either form.

## Contact email delivery

After updating `Code.gs`, deploy a **new version** of the Apps Script web app: **Deploy → Manage deployments → Edit → New version → Deploy**. The deployment must execute as the PWI Google account so the notification email is sent from that account.

The website's Contact form uses the same `/exec` web-app URL as the registration form. Keep `GOOGLE_APPS_SCRIPT_WEB_APP_URL` set in Vercel for Production, Preview, and Development.
