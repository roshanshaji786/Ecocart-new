#!/usr/bin/env python3
"""Push out/<key>.json to ecocart.co.in over the WP REST API.

Usage: python3 publish.py AUTHFILE key [key ...]   (AUTHFILE holds "claude:<app password>")
Pages: sets _elementor_data + edit mode builder + post_content. Posts: replaces or appends content.
Backups of the originals are in backup/ (restore by PUTting their content/meta back).
"""
import json, os, sys, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
W = 'https://ecocart.co.in/wp-json/wp/v2'


def call(auth, method, url, data=None):
    cmd = ['curl', '-sS', '-u', auth, '-A', 'Mozilla/5.0', '-X', method, url, '-H', 'Content-Type: application/json']
    if data is not None:
        cmd += ['--data-binary', '@-']
    r = subprocess.run(cmd, input=json.dumps(data).encode() if data is not None else None, capture_output=True)
    return json.loads(r.stdout)


def main():
    auth = open(sys.argv[1]).read().strip()
    for key in sys.argv[2:]:
        d = json.load(open(os.path.join(HERE, 'out', key + '.json')))
        if d['kind'] == 'page':
            body = {'content': d['content'], 'template': '',
                    'meta': {'_elementor_data': json.dumps(d['elementor'], ensure_ascii=False),
                             '_elementor_edit_mode': 'builder', '_elementor_template_type': 'wp-page'}}
            r = call(auth, 'POST', f"{W}/pages/{d['id']}", body)
        elif d['kind'] == 'post':
            r = call(auth, 'POST', f"{W}/posts/{d['id']}", {'content': d['content']})
        else:  # post-append, idempotent
            cur = call(auth, 'GET', f"{W}/posts/{d['id']}?context=edit")['content']['raw']
            if 'ecp-post-cta' in cur:
                cur = cur[:cur.index('\n<!-- wp:html -->\n<!-- ecp-post-cta -->')]
            r = call(auth, 'POST', f"{W}/posts/{d['id']}", {'content': cur + d['append']})
        print(key, r.get('id'), r.get('modified'), r.get('code'), r.get('message', '')[:200] if isinstance(r.get('message'), str) else '')


if __name__ == '__main__':
    main()
