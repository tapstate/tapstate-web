# 空跑留下的文件 —— 可以直接删

这个文件存在的唯一理由，是让一条**演练开发流程**的工作线有东西可提交。它不产生任何行为：
本仓 `package.json` 的 `build` 只建 `apps/web`，本仓 `.github/workflows/` 不存在（一条 CI 都没有），
没有任何代码 import 它。

它由 `newflow-rehearsal` 这条线加入。**执行跟踪在
[tapstate/tapstate#73](https://github.com/tapstate/tapstate/issues/73)** —— 本仓的
[#3](https://github.com/tapstate/tapstate-web/issues/3) 只是一条指路 issue，不承载任何状态。
同一次改动在 `tapstate` 的 `.github/newflow-rehearsal.md` 放了一份等价的英文文件。

## 怎么删

revert 引入它的那个合并提交：

    git revert -m 1 <合并提交>

树会逐字节回到合入前。除此之外没有别的要撤的东西。
