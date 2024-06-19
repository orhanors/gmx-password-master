const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CURRENT_EMAILS = './files/emails.txt';
const NEW_EMAILS = './files/new-emails.txt';
const ERRORS = './files/errors.txt';

async function changeGmxPassword(email, currentPassword, newPassword) {
    const browser = await puppeteer.launch({ headless: false, dumpio: true, });
    const page = await browser.newPage();

    try {
        //Go to login page
        await page.goto('https://www.gmx.com/#.1559516-header-navlogin2-1');
        await delay(2000)
        await page.goto('https://www.gmx.com/#.1559516-header-navlogin2-1');

        console.log("🤖 We are in the login page")
        
        // Log in
        await page.type('input[name="username"]', email);
        console.log("🤖 Email entered")

        await page.type('input[name="password"]', currentPassword);
        console.log("🤖 Password entered")
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log("🤖 🤖 LOGGED IN successfully")
        const currentUrl = page.url();
        console.log("currentUrl::", currentUrl)
        const accountUrl = currentUrl.replace('/mail', '/navigator/jump/to/ciss');
        console.log("accountUrl::", accountUrl)
        // Navigate to account settings
        await page.goto(accountUrl);

        await page.click('section.frequent-links__column a');
        await delay(2000)
        // await page.waitForNavigation();    

        // Wait for navigation or any other actions if needed

        console.log("👀 We are on the password change page");

        // Change password
        await page.type('input[id="1:form:editPanel:currentPasswordPanel:topWrapper:inputWrapper:input"]', currentPassword);
        await page.type('input[id="1:form:editPanel:newPasswordFieldPanel:topWrapper:inputWrapper:input"]', newPassword);
        await page.type('input[id="1:form:editPanel:retypeNewPasswordFieldPanel:topWrapper:inputWrapper:input"]', newPassword);
        await page.click('button[class="pos-button pos-button--cta"]');
        
        await delay(2000)
        // //Check if errors
        const errorWarnings = await page.$$eval('svg', anchors => 
            anchors.map(s => ({ class: s.getAttribute('class') }))
          );
        const foundBadPasswordError = errorWarnings?.find(warning => warning?.class?.includes('pos-message__icon--error'))
        if(foundBadPasswordError){
            console.error('❌ Bad password error for email: ', email);
            throw new Error('Bad password error');
        }
        // await page.waitForNavigation();

        console.log('✅ ✅ Password changed successfully for email: ', email);

    } catch (error) {
        // console.error('❌ Error changing password:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

async function processLineByLine() {
    const fileStream = fs.createReadStream(CURRENT_EMAILS);
  
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
  
    for await (const line of rl) {
      await delay(2000);
      // Each line in the file will be successively available here as `line`.
      const [email, currentPassword, newPassword] = line.split(':');
      
      if(!email && !currentPassword){
        throw new Error('Invalid email or password');
      }

      const newPass = newPassword || crypto.randomBytes(8).toString('hex');

      console.log(`<<<< email: ${email}, current password: ${currentPassword}, new password: ${newPass} >>>>`)
      try {
        await changeGmxPassword(email, currentPassword, newPass);
        fs.appendFile(NEW_EMAILS, `${email}:${newPass}\n`, function (err) {
            if (err) throw err;
            console.log('📁 Saved to last-version file! ', email);
          });
      } catch (error) {
        fs.appendFile(ERRORS, `${email}:${currentPassword}\n`, function (err) {
            if (err) {
                console.error('📁 ❌ Error saving to error file:', err);
                throw err;
            };
            console.log(' 📁 Saved to ERROR file! ', email);
          });

        console.log('❌ Failed to change password for email', email);
        console.log(error)
        continue;
        //Retry here
      }

    }
    console.log("✅ DONE PROCESSING ✅")
}
  
processLineByLine();

// Usage example
// changeGmxPassword('eliasmal2g@gmx.com', 'my1pYCqrb.', 'my1pYCqrb');