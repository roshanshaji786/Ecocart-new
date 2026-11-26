<?php
/**
 * Plugin Name: Eco chat (EcoCart sales assistant)
 * Description: Shows the Eco chat bubble on ecocart.co.in and forwards chats to the Eco server on the VPS.
 *              Installed as a must-use plugin by eco/deploy/tools/install-wp-widget.yml. Delete this file to remove Eco from the site.
 */
if (!defined('ABSPATH')) exit;

const ECO_CHAT_SERVER = '__ECO_URL__';      // Eco server, e.g. http://93.127.206.59:8795
const ECO_CHAT_SECRET = '__ECO_SECRET__';   // shared secret so only this site can use Eco's chat endpoint
const ECO_CHAT_VERSION = '2';

add_action('rest_api_init', function () {
  register_rest_route('eco/v1', '/chat', [
    'methods' => 'POST',
    'permission_callback' => '__return_true',
    'callback' => function (WP_REST_Request $req) {
      $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? '');
      $res = wp_remote_post(ECO_CHAT_SERVER . '/chat', [
        'timeout' => 40,
        'headers' => ['Content-Type' => 'application/json', 'X-Eco-Proxy' => ECO_CHAT_SECRET, 'X-Forwarded-For' => $ip],
        'body' => wp_json_encode([
          'message' => mb_substr((string) $req->get_param('message'), 0, 800),
          'session' => (string) $req->get_param('session'),
        ]),
      ]);
      if (is_wp_error($res)) {
        return new WP_REST_Response(['reply' => 'Sorry, I had a hiccup. Please WhatsApp us at +91 70120 45854.'], 200);
      }
      $data = json_decode(wp_remote_retrieve_body($res), true);
      $out = new WP_REST_Response(is_array($data) ? $data : ['reply' => 'Sorry, please try again.'], 200);
      $out->header('Cache-Control', 'no-store');
      return $out;
    },
  ]);
  register_rest_route('eco/v1', '/widget.js', [
    'methods' => 'GET',
    'permission_callback' => '__return_true',
    'callback' => function () {
      $js = get_transient('eco_chat_widget_js');
      if (!$js) {
        $res = wp_remote_get(ECO_CHAT_SERVER . '/widget/eco-widget.js', ['timeout' => 10]);
        $js = is_wp_error($res) ? '' : wp_remote_retrieve_body($res);
        if ($js) set_transient('eco_chat_widget_js', $js, HOUR_IN_SECONDS);
      }
      header('Content-Type: application/javascript; charset=utf-8');
      header('Cache-Control: public, max-age=3600');
      echo $js;
      exit;
    },
  ]);
});

// Bubble on every front-end page except checkout/cart/account, where it could distract from paying.
add_action('wp_footer', function () {
  if (is_admin() || (function_exists('is_checkout') && (is_checkout() || is_cart() || is_account_page()))) return;
  printf(
    '<script src="%s" data-endpoint="%s" defer></script>' . "\n",
    esc_url(rest_url('eco/v1/widget.js') . '?v=' . ECO_CHAT_VERSION),
    esc_url(rest_url('eco/v1/chat'))
  );
}, 99);

