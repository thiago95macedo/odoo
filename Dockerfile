FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONUNBUFFERED=1

# Instalação de dependências essenciais do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    libpq-dev \
    libldap2-dev \
    libsasl2-dev \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    libssl-dev \
    libffi-dev \
    libjpeg-dev \
    libpng-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libxcb1-dev \
    nodejs \
    npm \
    wkhtmltopdf \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Criação do usuário odoo com UID/GID 1000 (reaproveitando ubuntu:1000 da base 24.04)
RUN if id -u ubuntu >/dev/null 2>&1; then \
        usermod -l odoo ubuntu && \
        groupmod -n odoo ubuntu && \
        usermod -d /opt/odoo -m odoo; \
    else \
        groupadd -g 1000 odoo && \
        useradd -u 1000 -g odoo -d /opt/odoo -s /bin/bash odoo; \
    fi && \
    mkdir -p /opt/odoo /var/lib/odoo && \
    chown -R odoo:odoo /opt/odoo /var/lib/odoo

# Virtualenv isolado para pacotes Python
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

WORKDIR /opt/odoo
COPY requirements.txt /opt/odoo/requirements.txt
RUN pip install --no-cache-dir -r /opt/odoo/requirements.txt

USER odoo
EXPOSE 8069

CMD ["/opt/odoo/odoo-bin", "-c", "/opt/odoo/odoo.conf"]
