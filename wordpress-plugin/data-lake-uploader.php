<?php
/**
 * Plugin Name: Data Lake File Uploader
 * Description: Upload files to Microsoft Data Lake Storage
 * Version: 1.0.0
 * Author: Your Name
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class DataLakeUploader {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('data_lake_uploader', array($this, 'render_uploader'));
        add_action('wp_ajax_upload_to_datalake', array($this, 'handle_upload'));
        add_action('wp_ajax_nopriv_upload_to_datalake', array($this, 'handle_upload'));
        add_action('wp_ajax_list_datalake_files', array($this, 'list_files'));
        add_action('wp_ajax_nopriv_list_datalake_files', array($this, 'list_files'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
    }
    
    public function init() {
        // Plugin initialization
    }
    
    public function enqueue_scripts() {
        wp_enqueue_script('data-lake-uploader-js', plugin_dir_url(__FILE__) . 'assets/uploader.js', array('jquery'), '1.0.0', true);
        wp_enqueue_style('data-lake-uploader-css', plugin_dir_url(__FILE__) . 'assets/uploader.css', array(), '1.0.0');
        
        // Localize script for AJAX
        wp_localize_script('data-lake-uploader-js', 'dataLakeAjax', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('data_lake_nonce')
        ));
    }
    
    public function render_uploader($atts) {
        $atts = shortcode_atts(array(
            'max_files' => 10,
            'max_size' => '50MB'
        ), $atts);
        
        ob_start();
        ?>
        <div id="data-lake-uploader" class="data-lake-container">
            <div class="upload-header">
                <h3>📁 Upload Files to Data Lake</h3>
                <p>Upload documents and images securely</p>
            </div>
            
            <div class="upload-area" id="uploadArea">
                <div class="upload-content">
                    <div class="upload-icon">📤</div>
                    <h4>Drag & Drop Files Here</h4>
                    <p>or click to browse</p>
                    <input type="file" id="fileInput" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp" multiple>
                </div>
            </div>
            
            <div class="file-info" id="fileInfo" style="display: none;">
                <h4>Selected Files:</h4>
                <ul id="fileList"></ul>
                <button id="uploadBtn" class="upload-btn">Upload Files</button>
            </div>
            
            <div class="progress-section" id="progressSection" style="display: none;">
                <h4>Upload Progress</h4>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <p id="progressText">0%</p>
            </div>
            
            <div class="results-section" id="resultsSection" style="display: none;">
                <h4>Upload Results</h4>
                <div id="results"></div>
            </div>
            
            <div class="files-section">
                <h4>Recent Uploads</h4>
                <button id="refreshBtn" class="refresh-btn">🔄 Refresh</button>
                <div id="filesList" class="files-list">
                    <p>Loading files...</p>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function handle_upload() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'data_lake_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!isset($_FILES['file'])) {
            wp_send_json_error('No file uploaded');
        }
        
        $file = $_FILES['file'];
        
        // Validate file
        $allowed_types = array(
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain'
        );
        
        if (!in_array($file['type'], $allowed_types)) {
            wp_send_json_error('Invalid file type');
        }
        
        // Upload to Data Lake
        $result = $this->upload_to_azure($file);
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    private function upload_to_azure($file) {
        // Get Azure credentials from WordPress options
        $account_name = get_option('datalake_account_name');
        $account_key = get_option('datalake_account_key');
        $container = get_option('datalake_container', 'uploads');
        
        if (!$account_name || !$account_key) {
            return array('success' => false, 'message' => 'Azure credentials not configured');
        }
        
        // Call your Node.js server or implement Azure SDK directly
        $upload_url = get_option('datalake_server_url', 'http://localhost:3000/upload');
        
        $curl = curl_init();
        curl_setopt_array($curl, array(
            CURLOPT_URL => $upload_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => array(
                'file' => new CURLFile($file['tmp_name'], $file['type'], $file['name'])
            )
        ));
        
        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($http_code === 200) {
            $result = json_decode($response, true);
            return array(
                'success' => true,
                'fileName' => $result['fileName'],
                'filePath' => $result['filePath'],
                'size' => $result['size']
            );
        } else {
            return array('success' => false, 'message' => 'Upload failed');
        }
    }
    
    public function list_files() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'data_lake_nonce')) {
            wp_die('Security check failed');
        }
        
        $files_url = get_option('datalake_server_url', 'http://localhost:3000/files');
        
        $response = wp_remote_get($files_url);
        
        if (is_wp_error($response)) {
            wp_send_json_error('Failed to fetch files');
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        wp_send_json_success($data);
    }
    
    public function add_admin_menu() {
        add_options_page(
            'Data Lake Uploader Settings',
            'Data Lake Uploader',
            'manage_options',
            'data-lake-uploader',
            array($this, 'admin_page')
        );
    }
    
    public function admin_page() {
        if (isset($_POST['submit'])) {
            update_option('datalake_account_name', sanitize_text_field($_POST['account_name']));
            update_option('datalake_account_key', sanitize_text_field($_POST['account_key']));
            update_option('datalake_container', sanitize_text_field($_POST['container']));
            update_option('datalake_server_url', esc_url_raw($_POST['server_url']));
            echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
        }
        
        $account_name = get_option('datalake_account_name');
        $account_key = get_option('datalake_account_key');
        $container = get_option('datalake_container', 'uploads');
        $server_url = get_option('datalake_server_url', 'http://localhost:3000');
        ?>
        <div class="wrap">
            <h1>Data Lake Uploader Settings</h1>
            <form method="post" action="">
                <table class="form-table">
                    <tr>
                        <th scope="row">Azure Storage Account Name</th>
                        <td><input type="text" name="account_name" value="<?php echo esc_attr($account_name); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Azure Storage Account Key</th>
                        <td><input type="password" name="account_key" value="<?php echo esc_attr($account_key); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Container Name</th>
                        <td><input type="text" name="container" value="<?php echo esc_attr($container); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row">Upload Server URL</th>
                        <td><input type="url" name="server_url" value="<?php echo esc_attr($server_url); ?>" class="regular-text" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            
            <h2>Usage</h2>
            <p>Use the shortcode <code>[data_lake_uploader]</code> to display the uploader on any page or post.</p>
            
            <h3>Shortcode Options:</h3>
            <ul>
                <li><code>[data_lake_uploader max_files="5"]</code> - Limit number of files</li>
                <li><code>[data_lake_uploader max_size="10MB"]</code> - Set max file size</li>
            </ul>
        </div>
        <?php
    }
}

// Initialize the plugin
new DataLakeUploader();
?>