# Microsoft Dynamics 365 NAV

![microsoft-dynamics-ax-ecommerce](https://user-images.githubusercontent.com/5710732/35617807-6832f934-0679-11e8-8689-73ae77c7e371.png)

These instructions are applicable to Microsoft products in the Navision and Dynamics 365 product family.  They apply to editions which are 2015 or later.

In order  to connect to Dynamics, the following steps are required:

1. Register and configure an app in Active Directory or Azure Active Directory
2. Configure app details in elastic.io
3. Grant the app access to Dynamics 365 by completing the OAuth flow

# Register and configure an app in Active Directory or Azure Active Directory
The following steps and screenshots describe app registration on Azure Active
Directory.  These instructions may differ for other types of Active Directory.

1. Login to the [Azure Portal](https://portal.azure.com) with your Microsoft Credentials.
2. Select the **Azure Active Directory** resource from the selector on the left.

![screenshot from 2018-01-31 09-37-13](https://user-images.githubusercontent.com/5710732/35617709-3bbf7698-0679-11e8-9904-f093a4a84128.png)

3. Select **App registrations**.

![screenshot from 2018-01-31 09-38-06](https://user-images.githubusercontent.com/5710732/35617710-3bdba6ce-0679-11e8-97c1-c17ab764c464.png)

4. Select **New application registration**.

![screenshot from 2018-01-31 09-38-44](https://user-images.githubusercontent.com/5710732/35617711-3bf82894-0679-11e8-9a63-d500948a1559.png)

5. Enter:

   1. A **Name** of your choosing
   2. Select **Web app/API** for **Application Type**
   3. Enter `https://app.elastic.io/` for the **Sign-on URL**
6. Click **Create**

![screenshot from 2018-01-31 09-42-32](https://user-images.githubusercontent.com/5710732/35617712-3c14ba54-0679-11e8-89e8-dd72f52b0f5a.png)


7. Select the newly created application.
8. Select **Settings**

![screenshot from 2018-01-31 09-43-29](https://user-images.githubusercontent.com/5710732/35617713-3c30b736-0679-11e8-944e-23920225c716.png)

9. Select **Reply URLs**.  Add `https://app.elastic.io/callback/oauth2` as a
reply URL.  Click **Save**.

![screenshot from 2018-01-31 09-45-02](https://user-images.githubusercontent.com/5710732/35617714-3c4e5840-0679-11e8-8180-ebabbd3b0fa6.png)

10. Select **Required Permissions**.  Click **Add**.
11. Click **Select an API**
12. Click **Dynamics CRM Online** 

![screenshot from 2018-01-31 09-46-35](https://user-images.githubusercontent.com/5710732/35617715-3c8599ae-0679-11e8-9c1f-1de8c6f6001c.png)

13. Select the permission **Access CRM Online as organization users**
14. Click **Done** to add the permissions.

![screenshot from 2018-01-31 09-47-21](https://user-images.githubusercontent.com/5710732/35617716-3ca231d6-0679-11e8-8c96-6f682d6fb0d4.png)


15. Select **Keys**.  Enter:
    1. Some description for **Key description**.
    2. Set **Duration** to **Never expires**

![screenshot from 2018-01-31 09-50-05](https://user-images.githubusercontent.com/5710732/35617717-3cbaa14e-0679-11e8-92fc-7f1dd291c2ee.png)

16. Select **Save**.  Copy the key value created. You will need this value in
the **Configure app details in elastic.io** section.   

![screenshot from 2018-01-31 09-50-43](https://user-images.githubusercontent.com/5710732/35617718-3cdb3710-0679-11e8-8a9b-43d1868b614f.png)

17. Copy the value of the **Application ID**.  You will also need this value in the next section.

![screenshot from 2018-01-31 09-52-19](https://user-images.githubusercontent.com/5710732/35617719-3cf7fa44-0679-11e8-9c42-693b49b6f532.png)


# Configure app details in elastic.io
Create an account for the **OData with OAuth** component.  You will need to enter the following values:
* **Name Your Account**: Some name of your choosing
* **Url to the Resource Server's OData Context URL**: The URL to your Dynamics 365 instance followed by `/api/data/v8.2`
* **Client Id**: The value obtained in step 17 of *Register and configure an app
 in Active Directory or Azure Active Directory*
* **Client Secret**: The value obtained in step 16 of *Register and configure an app
 in Active Directory or Azure Active Directory*
* **Authorization Server Token Endpoint Url**: `https://login.windows.net/common/oauth2/token`
* **Authorization Server Authorization Endpoint Url**: `https://login.windows.net/common/oauth2/authorize?resource=<HTTP Encoded URL to your Dynamics 365 instance>` with the correct substitution.

![screenshot from 2018-01-31 09-58-38](https://user-images.githubusercontent.com/5710732/35617720-3d1cbaaa-0679-11e8-84d8-2883cc147886.png)

# Grant the app access to Dynamics 365 by completing the OAuth flow
TBD.  A current platform regression stops this.

# External Resources
* [Walkthrough: Register a Dynamics 365 app with Azure Active
 Directory](https://msdn.microsoft.com/en-us/library/mt622431.aspx)
