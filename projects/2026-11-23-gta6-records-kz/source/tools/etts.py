import sys, certifi
certifi.where = lambda: "/root/.ccr/ca-bundle.crt"
import edge_tts.communicate as c
import os
try:
    import ssl
    c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
except Exception: pass
from edge_tts.__main__ import main
sys.exit(main())
