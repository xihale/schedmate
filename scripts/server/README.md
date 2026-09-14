# sched.xeed.ink 服务器侧部署（gx 模式）

push → GitHub webhook → Caddy(unix socket) → systemd `Accept=yes` 模板实例 →
本目录 `webhook.mjs` 验签应答 → spawn `deploy.sh` → 发布 `/srv/sched`。
空闲 0 常驻进程。先例：zig-ci（zp.xeed.ink）/ ziglings-ci / blog-ci。

## 布局（gx = 1.14.133.242）

| 内容 | 路径 |
| --- | --- |
| 持久克隆 | `/home/sched-ci/schedmate` |
| webhook secret | `/home/sched-ci/.webhook-secret`（0600，与 GitHub hook 同值） |
| 部署日志 | `/home/sched-ci/deploy.log` |
| web 根 | `/srv/sched`（Caddy `root`） |
| 退役资产 attic | `/home/sched-ci/sched-attic`（保留 7 天 > shell 5d TTL） |
| systemd | `/etc/systemd/system/sched-deploy.socket` + `sched-deploy@.service` |

## 常量（改部署目标只动这里）

- `webhook.mjs`：`HOOK_PATH=/hooks/sched-deploy`、`SECRET_FILE`、`DEPLOY_LOG`
- `deploy.sh`：`REPO`、`DEST`、分支默认 `refs/heads/main`
- Caddy 块：`sched.xeed.ink`、`/hooks/sched-deploy`、`unix//run/sched-deploy.sock`
- 三处 TTL 配对：Caddy `@short` max-age(5d) < attic `-mtime +6`(7 天保留)

## 手动部署

```sh
ssh gx
runuser -u sched-ci -- bash ~/schedmate/scripts/server/deploy.sh
```
