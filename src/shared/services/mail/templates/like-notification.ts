export const likeNotificationTemplate = ({
  appName,
  name,
  email,
  likerName,
  likerAvatar,
  articleTitle,
  articleUrl,
  actionUrl,
  likeCount,
  supportEmail,
  companyName,
  companyAddress,
}): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Article Was Liked - ${appName}</title>
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
            background: linear-gradient(135deg, #FF6B6B, #FF8E8E);
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
        .like-card {
            background-color: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .like-icon {
            font-size: 48px;
            color: #FF6B6B;
            margin-bottom: 15px;
        }
        .liker-info {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 15px;
        }
        .liker-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 12px;
            background-color: #f0f0f0;
        }
        .liker-name {
            font-weight: bold;
            color: #FF6B6B;
        }
        .article-info {
            background-color: #fff5f5;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #FF6B6B;
        }
        .article-title {
            font-weight: bold;
            color: #d32f2f;
            margin-bottom: 5px;
        }
        .like-count {
            background-color: #FF6B6B;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
            margin: 10px 0;
        }
        .button {
            display: inline-block;
            background-color: #FF6B6B;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #e53935;
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
        <h1>❤️ Your Article Was Liked!</h1>
    </div>
    
    <div class="content">
        <h2>Hello ${name},</h2>
        
        <p>Great news! Someone liked your article.</p>
        
        <div class="like-card">
            <div class="like-icon">❤️</div>
            
            <div class="liker-info">
                ${likerAvatar ? `<img src="${likerAvatar}" alt="${likerName}" class="liker-avatar">` : '<div class="liker-avatar"></div>'}
                <div>
                    <div class="liker-name">${likerName}</div>
                    <div style="color: #666; font-size: 14px;">liked your article</div>
                </div>
            </div>
            
            <div class="like-count">${likeCount} ${likeCount === 1 ? 'like' : 'likes'}</div>
        </div>
        
        <div class="article-info">
            <div class="article-title">${articleTitle}</div>
            <div style="color: #666; font-size: 14px;">Your article that received the like</div>
        </div>
        
        <div style="text-align: center;">
            <a href="${actionUrl || articleUrl}" class="button">View Article</a>
        </div>
        
        <div class="divider"></div>
        
        <p>Keep up the great work! Your content is resonating with readers.</p>
        
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
