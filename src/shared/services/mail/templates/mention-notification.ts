export const mentionNotificationTemplate = ({
  appName,
  name,
  email,
  mentionerName,
  mentionerAvatar,
  content,
  contentUrl,
  actionUrl,
  supportEmail,
  companyName,
  companyAddress,
}): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You Were Mentioned - ${appName}</title>
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
            background: linear-gradient(135deg, #4CAF50, #66BB6A);
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
        .mention-card {
            background-color: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .mentioner-info {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .mentioner-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 12px;
            background-color: #f0f0f0;
        }
        .mentioner-name {
            font-weight: bold;
            color: #4CAF50;
        }
        .mention-content {
            background-color: #f1f8e9;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #4CAF50;
            margin: 15px 0;
            font-style: italic;
        }
        .mention-highlight {
            background-color: #E8F5E8;
            padding: 2px 4px;
            border-radius: 3px;
            font-weight: bold;
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
        .button:hover {
            background-color: #388E3C;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
        }
        .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>@${name} - You Were Mentioned!</h1>
    </div>
    
    <div class="content">
        <h2>Hello ${name},</h2>
        
        <p>Someone mentioned you in their content!</p>
        
        <div class="mention-card">
            <div class="mentioner-info">
                ${mentionerAvatar ? `<img src="${mentionerAvatar}" alt="${mentionerName}" class="mentioner-avatar">` : '<div class="mentioner-avatar"></div>'}
                <div>
                    <div class="mentioner-name">${mentionerName}</div>
                    <div style="color: #666; font-size: 14px;">mentioned you</div>
                </div>
            </div>
            
            <div class="mention-content">
                "${content.replace(new RegExp(`@${name}`, 'gi'), `<span class="mention-highlight">@${name}</span>`)}"
            </div>
        </div>
        
        <div style="text-align: center;">
            <a href="${actionUrl || contentUrl}" class="button">View Mention</a>
        </div>
        
        <div class="divider"></div>
        
        <p>You can reply to this mention or engage with the conversation.</p>
        
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
