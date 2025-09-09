export const passwordResetTemplate = ({
  appName,
  name,
  email,
  resetLink,
  expirationTime,
  supportEmail,
  companyName,
  companyAddress,
}): string => `    
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - ${appName}</title>
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
            background-color: #f44336;
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
            background-color: #f44336;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
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
        <h1>Password Reset Request</h1>
    </div>
    
    <div class="content">
        <h2>Hello ${name},</h2>
        
        <p>We received a request to reset your password for your ${appName} account.</p>
        
        <p>If you requested this password reset, please click the button below to create a new password:</p>
        
        <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
        </div>
        
        <div class="warning">
            <strong>Important Security Information:</strong>
            <ul>
                <li>This link will expire in ${expirationTime} hours</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
            </ul>
        </div>
        
        <p>For security reasons, this link can only be used once. If you need to reset your password again, please request a new reset link.</p>
        
        <p>If you have any questions or concerns, please contact our support team at ${supportEmail}}.</p>
        
        <p>Best regards,<br>The ${appName} Team</p>
    </div>
    
    <div class="footer">
        <p>This email was sent to ${email} from ${appName}}.</p>
        <p>${companyName} - ${companyAddress}}</p>
        <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
    </div>
</body>
</html>
`;
