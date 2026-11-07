<template>
  <div class="gallery-backtop" style="height: 160px; overflow-y: auto">
    <p style="height: 600px">向下滚动查看回到顶部按钮。</p>
  </div>
  <el-backtop target=".gallery-backtop" :bottom="100">
    <div
      style="
        height: 100%;
        width: 100%;
        background-color: var(--el-bg-color-overlay);
        box-shadow: var(--el-box-shadow-lighter);
        text-align: center;
        line-height: 40px;
        color: #1989fa;
      "
    >
      UP
    </div>
  </el-backtop>
</template>
