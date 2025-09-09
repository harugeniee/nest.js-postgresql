export const welcomeTemplate = ({
  appName,
  name,
  email,
  username,
  accountType,
  verificationLink,
  supportEmail,
  companyName,
  companyAddress,
}): string => `    
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${appName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to ${appName}!</h1>
    </div>
    
    <div class="content">
        <h2>Hello ${name},</h2>
        
        <p>Welcome to ${appName}! We're excited to have you on board.</p>
        
        <p>Your account has been successfully created with the following details:</p>
        <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Username:</strong> ${username}</li>
            <li><strong>Account Type:</strong> ${accountType}</li>
        </ul>
        
        <p>To get started, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify Email Address</a>
        </div>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team at ${supportEmail}}.</p>
        
        <p>Best regards,<br>The ${appName} Team</p>
    </div>
    
    <div class="footer">
        <p>This email was sent to ${email} from ${appName}}.</p>
        <p>${companyName} - ${companyAddress}}</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
    </div>
</body>
</html>
`;
