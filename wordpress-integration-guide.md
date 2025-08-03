# WordPress Integration Guide

## 🚀 Quick Setup Options

### Option 1: WordPress Plugin (Recommended)

1. **Upload the Plugin**:
   - Zip the `wordpress-plugin` folder
   - Go to WordPress Admin → Plugins → Add New → Upload Plugin
   - Upload and activate the plugin

2. **Configure Settings**:
   - Go to Settings → Data Lake Uploader
   - Enter your Azure credentials:
     - Storage Account Name
     - Storage Account Key
     - Container Name (default: uploads)
     - Upload Server URL (your Node.js server)

3. **Use the Shortcode**:
   ```
   [data_lake_uploader]
   ```
   Add this shortcode to any page or post where you want the uploader.

### Option 2: Direct Integration

If you want to integrate directly into your theme:

1. **Add to functions.php**:
```php
function enqueue_data_lake_uploader() {
    wp_enqueue_script('data-lake-js', 'https://your-server.com/script.js', array('jquery'), '1.0.0', true);
    wp_enqueue_style('data-lake-css', 'https://your-server.com/styles.css', array(), '1.0.0');
}
add_action('wp_enqueue_scripts', 'enqueue_data_lake_uploader');
```

2. **Create a Custom Page Template**:
```php
<?php
/*
Template Name: File Uploader
*/
get_header(); ?>

<div class="container">
    <iframe src="https://your-server.com" width="100%" height="800px" frameborder="0"></iframe>
</div>

<?php get_footer(); ?>
```

### Option 3: Embed as iFrame

Simply add this HTML to any WordPress page:

```html
<iframe src="https://your-server.com" width="100%" height="800px" frameborder="0" style="border: none; border-radius: 10px;"></iframe>
```

## 🔧 Server Setup for WordPress

Your Node.js server needs to be accessible from WordPress. You have two options:

### A. Host on Same Server
- Upload your Node.js app to your hosting provider
- Run it on a different port (e.g., :3000)
- Update WordPress plugin settings with the correct URL

### B. Use External Hosting
- Deploy to services like:
  - Heroku
  - Vercel
  - DigitalOcean
  - AWS EC2
- Update the server URL in WordPress settings

## 📝 Step-by-Step WordPress Setup

1. **Install the Plugin**:
   ```bash
   # Zip the plugin folder
   zip -r data-lake-uploader.zip wordpress-plugin/
   ```

2. **Upload to WordPress**:
   - Admin Dashboard → Plugins → Add New
   - Upload Plugin → Choose File → Install Now
   - Activate Plugin

3. **Configure Azure Settings**:
   - Settings → Data Lake Uploader
   - Fill in your Azure credentials
   - Set your Node.js server URL

4. **Add to Page/Post**:
   - Edit any page or post
   - Add the shortcode: `[data_lake_uploader]`
   - Publish/Update

5. **Test the Upload**:
   - Visit the page with the shortcode
   - Try uploading a file
   - Check your Azure Data Lake for the uploaded file

## 🎨 Customization Options

### Shortcode Parameters:
```
[data_lake_uploader max_files="5" max_size="10MB"]
```

### CSS Customization:
Add custom CSS in WordPress Customizer → Additional CSS:

```css
.data-lake-container {
    background: #f0f8ff;
    padding: 20px;
    border-radius: 15px;
}

.upload-area {
    border-color: #your-brand-color;
}
```

## 🔒 Security Considerations

1. **File Validation**: The plugin validates file types and sizes
2. **Nonce Protection**: WordPress nonces prevent CSRF attacks
3. **User Permissions**: Only logged-in users can upload (configurable)
4. **Azure Security**: Files are stored securely in Azure Data Lake

## 🐛 Troubleshooting

### Common Issues:

1. **Plugin not working**:
   - Check if Node.js server is running
   - Verify Azure credentials
   - Check browser console for errors

2. **Files not uploading**:
   - Verify file types are allowed
   - Check file size limits
   - Ensure Azure container exists

3. **CORS errors**:
   - Add your WordPress domain to CORS settings in server.js
   - Update the cors configuration

### Debug Mode:
Add this to wp-config.php for debugging:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## 📞 Support

If you need help:
1. Check the browser console for JavaScript errors
2. Check WordPress debug logs
3. Verify your Node.js server is accessible
4. Test Azure credentials directly

The plugin creates a seamless integration between WordPress and your Data Lake uploader!