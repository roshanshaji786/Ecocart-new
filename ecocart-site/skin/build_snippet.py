"""Builds snippet.php: the one Code Snippets PHP snippet that runs the EcoCart skin + speed fixes.
Assets are embedded (base64) and written once to wp-content/uploads/ecocart-skin/<hash>/.
Run: python3 build_snippet.py   (needs css/icon-*.css downloaded from the theme next to it, see ICONS)
"""
import base64, hashlib, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ICON_SRC = os.path.join(HERE, 'icon-src')
FONTS = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Fraunces:ital,wght@1,400;1,500&display=swap'

def slim_icons():
    """Theme icon CSS embeds each font as base64 (1.5 MB). Point @font-face at the theme's own woff2/woff files instead."""
    out = []
    for name, fam in [('interface', 'klbtheme'), ('ecommerce', 'klbtheme-ecommerce'), ('delivery', 'klbtheme-delivery'), ('social', 'klbtheme-social')]:
        css = open(os.path.join(ICON_SRC, f'icon-{name}.css')).read()
        rules = re.sub(r'@font-face\s*\{.*?\}', '', css, flags=re.S)
        rules = re.sub(r'@media[^{]*\{\s*\}', '', rules)
        rules = re.sub(r'/\*.*?\*/', '', rules, flags=re.S)
        rules = re.sub(r'\s+', ' ', rules)
        rules = re.sub(r'\s*([{};:,>])\s*', r'\1', rules)
        base = f'/wp-content/themes/blonwe/assets/fonts/{name}/klbtheme'
        out.append(f"@font-face{{font-family:'{fam}';src:url('{base}.woff2') format('woff2'),url('{base}.woff') format('woff');font-weight:400;font-style:normal;font-display:block}}")
        out.append(rules)
    return '\n'.join(out)

icons = '.ec-guard{display:none}\n' + slim_icons()  # guard: child theme style.css ends with a stray <script> tag that swallows the next CSS rule
fontcss = '.ec-guard{display:none}\n' + open(os.path.join(HERE, 'fonts', 'fonts.css')).read()
FONTFILES = sorted(f for f in os.listdir(os.path.join(HERE, 'fonts')) if f.endswith('.woff2'))
fontdata = {f: base64.b64encode(open(os.path.join(HERE, 'fonts', f), 'rb').read()).decode() for f in FONTFILES}
# Phone layouts accepted from the mobile pass live in ../mobile/live/ (NN-area.css / NN-area.js, loaded in name order after skin.css / skin.js)
LIVE = os.path.join(HERE, '..', 'mobile', 'live')
live = sorted(os.listdir(LIVE)) if os.path.isdir(LIVE) else []
skin = '.ec-guard{display:none}\n' + open(os.path.join(HERE, 'skin.css')).read() + ''.join('\n/* ==== mobile/live/' + f + ' ==== */\n' + open(os.path.join(LIVE, f)).read() for f in live if f.endswith('.css'))
js = open(os.path.join(HERE, 'skin.js')).read() + ''.join('\n/* mobile/live/' + f + ' */\n' + open(os.path.join(LIVE, f)).read() for f in live if f.endswith('.js'))
REV = '10'  # bump when only the PHP logic changes, so LiteSpeed gets purged
ver = hashlib.md5((REV + icons + skin + js + fontcss + ''.join(fontdata.values())).encode()).hexdigest()[:10]
b64 = lambda s: base64.b64encode(s.encode()).decode()

fontlines = '\n'.join(f"\t\t\t'{n}' => '{d}'," for n, d in fontdata.items())
php = f'''<?php
/**
 * EcoCart skin + speed (built {ver}). Source: /mnt/project-files/ecocart-site/skin/ in the Claude project.
 * 1. Replaces the theme icon CSS (1.5 MB of base64 fonts) with a slim copy that loads the theme's woff2 files.
 * 2. Swaps the 18-weight Jost Google font for self-hosted Inter Tight + Fraunces (same as the new homepage).
 * 3. Adds the new design (skin.css) to every page except the homepage, which has its own design.
 * 4. Shows product photos right away (LiteSpeed delays the gallery script until the first tap).
 * 5. Adds the WhatsApp order button, trust strip and tidier shop filters (skin.js).
 * To undo everything: deactivate this snippet.
 */
if ( ! defined( 'ABSPATH' ) ) {{ return; }}

if ( ! function_exists( 'ecocart_skin_files' ) ) {{
	function ecocart_skin_files() {{
		$ver  = '{ver}';
		$up   = wp_upload_dir();
		$dir  = trailingslashit( $up['basedir'] ) . 'ecocart-skin/' . $ver;
		$url  = trailingslashit( $up['baseurl'] ) . 'ecocart-skin/' . $ver;
		$files = array(
			'icons.css' => '{b64(icons)}',
			'skin.css'  => '{b64(skin)}',
			'fonts.css' => '{b64(fontcss)}',
{fontlines}
		);
		if ( ! file_exists( $dir . '/skin.css' ) ) {{
			wp_mkdir_p( $dir );
			foreach ( $files as $name => $data ) {{
				$body = base64_decode( $data );
				if ( 'fonts.css' === $name ) {{
					$body = str_replace( '__BASE__', $url, $body );
				}}
				file_put_contents( $dir . '/' . $name, $body );
			}}
			if ( function_exists( 'do_action' ) ) {{
				do_action( 'litespeed_purge_all' );
			}}
		}}
		return file_exists( $dir . '/skin.css' ) ? array( 'url' => $url, 'ver' => $ver ) : false;
	}}
}}

add_action( 'wp_enqueue_scripts', function () {{
	$f = ecocart_skin_files();
	if ( ! $f ) {{
		return;
	}}
	foreach ( array( 'icon-interface', 'icon-ecommerce', 'icon-delivery', 'icon-social' ) as $h ) {{
		wp_dequeue_style( $h );
	}}
	wp_enqueue_style( 'ecocart-icons', $f['url'] . '/icons.css', array(), $f['ver'] );
	wp_dequeue_style( 'blonwe-font-url' );
	wp_enqueue_style( 'ecocart-fonts', $f['url'] . '/fonts.css', array(), $f['ver'] );
	if ( ! is_front_page() && ! is_page_template( 'elementor_canvas' ) ) {{
		wp_enqueue_style( 'ecocart-skin', $f['url'] . '/skin.css', array( 'blonwe-child-style' ), $f['ver'] );
	}}
}}, 100 );

add_action( 'wp_head', function () {{
	$f = ecocart_skin_files();
	if ( $f ) {{
		echo '<link rel="preload" href="' . esc_url( $f['url'] . '/InterTight-normal-latin.woff2' ) . '" as="font" type="font/woff2" crossorigin>' . "\\n";
	}}
}}, 1 );

add_action( 'wp_footer', function () {{
	if ( is_front_page() || is_page_template( 'elementor_canvas' ) ) {{
		return;
	}}
	echo '<script data-no-optimize="1">' . base64_decode( '{b64(js)}' ) . '</script>';
}}, 99 );

// Main product photo and other above-the-fold images: skip lazy-load so they appear immediately.
add_filter( 'wp_get_attachment_image_attributes', function ( $attr ) {{
	static $gallery_done = false;
	if ( ! $gallery_done && function_exists( 'is_product' ) && is_product() && isset( $attr['class'] ) && false !== strpos( $attr['class'], 'wp-post-image' ) ) {{
		$gallery_done          = true; // first product image on a product page = the main gallery photo
		$attr['fetchpriority'] = 'high';
	}}
	if ( isset( $attr['fetchpriority'] ) && 'high' === $attr['fetchpriority'] ) {{
		$attr['data-no-lazy'] = '1';
		$attr['loading']      = 'eager';
	}}
	return $attr;
}}, 20 );

// Speed: drop two stylesheets nothing uses (dark-mode CSS, the dark toggle is hidden; Elementor's local Roboto, the site uses Inter Tight).
add_filter( 'style_loader_tag', function ( $tag, $handle, $href ) {{
	$href = (string) $href;
	if ( false !== strpos( $href, '/blonwe/assets/css/base-dark.css' ) || false !== strpos( $href, '/elementor/google-fonts/css/roboto' ) ) {{
		return '';
	}}
	return $tag;
}}, 10, 3 );

// SEO: product category and tag pages get their own name as the H1 instead of "Shop" (the theme prints the shop page title).
add_action( 'template_redirect', function () {{
	if ( is_admin() || ! function_exists( 'is_product_taxonomy' ) || ! is_product_taxonomy() ) {{
		return;
	}}
	$name = single_term_title( '', false );
	if ( ! $name ) {{
		return;
	}}
	ob_start( function ( $html ) use ( $name ) {{
		return preg_replace( '#<h1 class="woocommerce-page-title">\\s*Shop\\s*</h1>#', '<h1 class="woocommerce-page-title">' . esc_html( $name ) . '</h1>', $html, 1 );
	}} );
}} );

// Speed: the theme prints the main product photo (the biggest thing on a product page) with loading="lazy"; load it first instead.
add_action( 'template_redirect', function () {{
	if ( is_admin() || ! function_exists( 'is_product' ) || ! is_product() ) {{
		return;
	}}
	ob_start( function ( $html ) {{
		$g = strpos( $html, 'woocommerce-product-gallery__image' );
		$i = false === $g ? false : strpos( $html, '<img', $g );
		$e = false === $i ? false : strpos( $html, '>', $i );
		if ( false === $e ) {{
			return $html;
		}}
		$tag = substr( $html, $i, $e - $i + 1 );
		$new = str_replace( ' loading="lazy"', '', $tag );
		if ( false === strpos( $new, 'fetchpriority=' ) ) {{
			$new = str_replace( '<img ', '<img fetchpriority="high" ', $new );
		}}
		if ( false === strpos( $new, 'data-no-lazy' ) ) {{
			$new = str_replace( '<img ', '<img data-no-lazy="1" ', $new );
		}}
		return substr_replace( $html, $new, $i, strlen( $tag ) );
	}} );
}} );

// SEO: blog lists show post titles as H2 (the theme prints every title as an H1).
add_action( 'template_redirect', function () {{
	if ( is_admin() || is_feed() || ! ( is_home() || is_category() || is_tag() || is_author() || is_date() ) ) {{
		return;
	}}
	ob_start( function ( $html ) {{
		return preg_replace( '#<h1 class="entry-title">(.*?)</h1>#s', '<h2 class="entry-title">$1</h2>', $html );
	}} );
}} );
'''
open(os.path.join(HERE, 'snippet.php'), 'w').write(php)
print('ver', ver, 'icons', len(icons), 'skin', len(skin), 'js', len(js), 'php', len(php))
