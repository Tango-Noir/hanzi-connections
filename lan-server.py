#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
汉字联系 · 局域网试玩服务
把本脚本所在目录作为静态网站服务起来。
同网段的手机 / 平板 / 电脑，浏览器打开显示出的「局域网设备」地址即可玩。
关闭本窗口（或 Ctrl+C）即停止服务。
"""
import http.server
import os
import socket
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
PORT_START = 8000
PORT_END = 8099


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE, **kwargs)

    def log_message(self, fmt, *args):
        pass  # 安静一点，不刷日志


def local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('10.255.255.255', 1))
            return s.getsockname()[0]
        finally:
            s.close()
    except OSError:
        pass
    try:
        return socket.gethostbyname(socket.gethostname())
    except OSError:
        return '127.0.0.1'


def main():
    srv = None
    port = None
    for p in range(PORT_START, PORT_END + 1):
        try:
            srv = http.server.ThreadingHTTPServer(('0.0.0.0', p), Handler)
            port = p
            break
        except OSError:
            continue
    if srv is None:
        print('启动失败：端口 %d~%d 都被占用，请关闭占用程序的进程后重试' % (PORT_START, PORT_END))
        return 1
    ip = local_ip()
    print('=' * 52)
    print(' 汉字联系 · 局域网试玩服务已启动')
    print('=' * 52)
    print(' 目录: ' + BASE)
    print()
    print(' 本机电脑:   http://127.0.0.1:%d/' % port)
    print(' 局域网设备: http://%s:%d/' % (ip, port))
    print('            （手机/平板需与电脑连同一个 Wi-Fi / 局域网）')
    print()
    print(' 关闭本窗口即停止服务。')
    print('-' * 52)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
