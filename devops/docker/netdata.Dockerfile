FROM netdata/netdata:latest

COPY devops/monitoring/netdata/netdata.conf /etc/netdata/netdata.conf
