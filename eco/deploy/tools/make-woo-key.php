<?php
// Run with: wp eval-file make-woo-key.php
// Creates a READ-ONLY WooCommerce REST key for Eco and saves it to /eco/woo.json
// (Eco's data volume). The key is never printed.
$out = '/eco/woo.json';
if (file_exists($out)) { WP_CLI::log('Key file already exists, nothing to do.'); return; }
if (!function_exists('wc_rand_hash') || !function_exists('wc_api_hash')) { WP_CLI::error('WooCommerce not loaded.'); }
global $wpdb;
$admins = get_users(['role' => 'administrator', 'orderby' => 'ID', 'order' => 'ASC', 'number' => 1, 'fields' => 'ID']);
$uid = (int) ($admins[0] ?? 0);
if (!$uid) { WP_CLI::error('No administrator user found.'); }
$ck = 'ck_' . wc_rand_hash();
$cs = 'cs_' . wc_rand_hash();
$ok = $wpdb->insert($wpdb->prefix . 'woocommerce_api_keys', [
  'user_id' => $uid, 'description' => 'Eco sales agent (VPS), read only', 'permissions' => 'read',
  'consumer_key' => wc_api_hash($ck), 'consumer_secret' => $cs, 'truncated_key' => substr($ck, -7),
], ['%d', '%s', '%s', '%s', '%s', '%s']);
if (!$ok) { WP_CLI::error('Insert failed: ' . $wpdb->last_error); }
$id = (int) $wpdb->insert_id;
file_put_contents($out, wp_json_encode(['consumer_key' => $ck, 'consumer_secret' => $cs, 'key_id' => $id, 'created' => gmdate('c')]));
chmod($out, 0600);
WP_CLI::success("Created read-only WooCommerce key #$id (ending " . substr($ck, -7) . ") for user $uid; saved for Eco.");
