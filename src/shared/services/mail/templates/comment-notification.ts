export const commentNotificationTemplate = ({
  appName,
  name,
  email,
  commenterName,
  commenterAvatar,
  articleTitle,
  articleUrl,
  commentContent,
  commentUrl,
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
    <title>New Comment on Your Article - ${appName}</title>
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
        .comment-card {
            background-color: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .commenter-info {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .commenter-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 12px;
            background-color: #f0f0f0;
        }
        .commenter-name {
            font-weight: bold;
            color: #2196F3;
        }
        .comment-content {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #2196F3;
            margin: 15px 0;
            font-style: italic;
        }
        .article-info {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .article-title {
            font-weight: bold;
            color: #1565c0;
            margin-bottom: 5px;
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
        .button:hover {
            background-color: #1976D2;
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
        <h1>New Comment on Your Article</h1>
    </div>
    
    <div class="content">
        <h2>Hello ${name},</h2>
        
        <p>Someone commented on your article!</p>
        
        <div class="comment-card">
            <div class="commenter-info">
                ${commenterAvatar ? `<img src="${commenterAvatar}" alt="${commenterName}" class="commenter-avatar">` : '<div class="commenter-avatar"></div>'}
                <div>
                    <div class="commenter-name">${commenterName}</div>
                    <div style="color: #666; font-size: 14px;">commented on your article</div>
                </div>
            </div>
            
            <div class="comment-content">
                "${commentContent}"
            </div>
        </div>
        
        <div class="article-info">
            <div class="article-title">${articleTitle}</div>
            <div style="color: #666; font-size: 14px;">Your article that received the comment</div>
        </div>
        
        <div style="text-align: center;">
            <a href="${actionUrl || commentUrl}" class="button">View Comment</a>
        </div>
        
        <div class="divider"></div>
        
        <p>You can reply to this comment or manage all comments on your article.</p>
        
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
