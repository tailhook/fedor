import re
from urllib.parse import unquote_plus as urldecode

camel_re = re.compile('([A-Z][^A-Z])')
split_re = re.compile('[ _]')


def uri_to_title(url):
    url = urldecode(url.strip('/'))
    words = split_re.split(camel_re.sub(' \\1', url))
    title = ' '.join(words).title()
    return title
