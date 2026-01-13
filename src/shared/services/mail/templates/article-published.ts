export const articlePublishedTemplate = ({
  appName,
  name,
  email,
  articleTitle,
  articleUrl,
  articleSummary,
  publishedAt,
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
    <title>Your Article Was Published - ${appName}</title>
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
            background: linear-gradient(135deg, #9C27B0, #BA68C8);
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
        .article-card {
            background-color: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .article-title {
            font-size: 24px;
            font-weight: bold;
            color: #9C27B0;
            margin-bottom: 15px;
            line-height: 1.3;
        }
        .article-summary {
            background-color: #f3e5f5;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #9C27B0;
            margin: 15px 0;
            font-style: italic;
        }
        .publish-info {
            background-color: #e8f5e8;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
        }
        .publish-time {
            font-weight: bold;
            color: #4CAF50;
            font-size: 18px;
        }
        .button {
            display: inline-block;
            background-color: #9C27B0;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #7B1FA2;
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
        .celebration {
            text-align: center;
            font-size: 48px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Your Article is Live!</h1>
    </div>
    
    <div class="content">
        <h2>Hello ${name},</h2>
        
        <div class="celebration">🎉</div>
        
        <p>Congratulations! Your article has been published and is now live on ${appName}.</p>
        
        <div class="article-card">
            <div class="article-title">${articleTitle}</div>
            
            ${
              articleSummary
                ? `
            <div class="article-summary">
                "${articleSummary}"
            </div>
            `
                : ''
            }
        </div>
        
        <div class="publish-info">
            <div class="publish-time">Published on ${publishedAt}</div>
            <div style="color: #666; font-size: 14px; margin-top: 5px;">Your article is now visible to readers</div>
        </div>
        
        <div style="text-align: center;">
            <a href="${actionUrl || articleUrl}" class="button">View Your Article</a>
        </div>
        
        <div class="divider"></div>
        
        <p>Your article is now live and ready to be discovered by readers. Share it with your network to get more engagement!</p>
        
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
