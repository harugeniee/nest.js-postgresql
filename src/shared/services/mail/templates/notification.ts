export const notificationTemplate = ({
  appName,
  name,
  email,
  notificationTitle,
  notificationMessage,
  actionRequired,
  actionDescription,
  actionLink,
  actionButtonText,
  additionalInfo,
  supportEmail,
  companyName,
  companyAddress,
}): string => `    
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${notificationTitle} - ${appName}</title>
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
            background-color: #2196F3;
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
            background-color: #2196F3;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .info-box {
            background-color: #e3f2fd;
            border: 1px solid #bbdefb;
            color: #1565c0;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .info-list {
            background-color: #f5f5f5;
            border: 1px solid #e0e0e0;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .info-list ul {
            margin: 0;
            padding-left: 20px;
        }
        .info-list li {
            margin: 5px 0;
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
        <h1>${notificationTitle}</h1>
    </div>
    
    <div class="content">
        <h2>Hello ${name},</h2>
        
        <p>${notificationMessage}</p>
        
        ${
          actionRequired
            ? `
        <div class="info-box">
            <strong>Action Required:</strong>
            <p>${actionDescription}</p>
            <div style="text-align: center;">
                <a href="${actionLink}" class="button">${actionButtonText}</a>
            </div>
        </div>
        `
            : ''
        }
        
        ${
          additionalInfo && additionalInfo.length > 0
            ? `
        <div class="info-list">
            <h3>Additional Information:</h3>
            <ul>
                ${additionalInfo.map((info) => `<li><strong>${info.label}:</strong> ${info.value}</li>`).join('')}
            </ul>
        </div>
        `
            : ''
        }
        
        <p>If you have any questions or need assistance, please contact our support team at ${supportEmail}.</p>
        
        <p>Best regards,<br>The ${appName} Team</p>
    </div>
    
    <div class="footer">
        <p>This notification was sent to ${email} from ${appName}.</p>
        <p>${companyName} - ${companyAddress}</p>
        <p>If you believe you received this notification in error, please contact our support team.</p>
    </div>
</body>
</html>
`;
