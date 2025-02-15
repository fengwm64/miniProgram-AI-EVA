// index.js
Page({
  data: {
    datasetLabels: {},
    datasetImages: [],
    modelPath: "" // 用于保存下载后的模型文件路径
  },

  // 点击“下载评测数据集”按钮时调用
  downloadDataset: function () {
    // 按要求修改 datasetUrl
    const datasetUrl = "https://hub.fnas64.xin/https://raw.githubusercontent.com/fengwm64/miniprogram-ai-eva/main/dataset/labels.json";
    const fileManager = wx.getFileSystemManager();
    const labelsPath = `${wx.env.USER_DATA_PATH}/labels.json`;
    const that = this;

    wx.downloadFile({
      url: datasetUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          console.log("labels.json 下载成功", res.tempFilePath);
          // 从临时文件读取内容，确保数据完整
          fileManager.readFile({
            filePath: res.tempFilePath,
            encoding: "utf8",
            success: (readTempRes) => {
              console.log("读取临时文件成功，内容：", readTempRes.data);
              // 将读取到的内容写入到目标路径
              fileManager.writeFile({
                filePath: labelsPath,
                data: readTempRes.data,
                encoding: "utf8",
                success: () => {
                  console.log("标签文件写入成功", labelsPath);
                  // 再次读取文件，解析 JSON 数据
                  fileManager.readFile({
                    filePath: labelsPath,
                    encoding: "utf8",
                    success: (readRes) => {
                      try {
                        let dataset = JSON.parse(readRes.data);
                        console.log("解析后的数据集：", dataset);
                        that.setData({ datasetLabels: dataset });
                        // 开始下载所有图片
                        that.downloadImages(dataset.images);
                      } catch (e) {
                        console.error("JSON 解析错误", e);
                      }
                    },
                    fail: (err) => {
                      console.error("读取标签文件失败", err);
                    }
                  });
                },
                fail: (err) => {
                  console.error("写入标签文件失败", err);
                }
              });
            },
            fail: (err) => {
              console.error("读取临时文件失败", err);
            }
          });
        } else {
          console.error("标签文件下载失败，状态码：", res.statusCode);
        }
      },
      fail: (err) => {
        console.error("下载标签文件失败", err);
      }
    });
  },

  // 遍历图片列表，下载所有图片并保存到本地
  downloadImages: function (images) {
    const that = this;
    const fileManager = wx.getFileSystemManager();
    let downloadedImages = [];
    let downloadCount = 0;
    const total = images.length;

    images.forEach((imgInfo) => {
      wx.downloadFile({
        url: imgInfo.url,
        success: (res) => {
          if (res.statusCode === 200) {
            // 避免目录结构问题，将斜杠替换为下划线保存为文件名
            const localPath = `${wx.env.USER_DATA_PATH}/${imgInfo.name.replace(/\//g, '_')}`;
            fileManager.saveFile({
              tempFilePath: res.tempFilePath,
              filePath: localPath,
              success: (saveRes) => {
                console.log(`图片 ${imgInfo.name} 保存成功: `, saveRes.savedFilePath);
                downloadedImages.push({
                  name: imgInfo.name,
                  path: saveRes.savedFilePath,
                  label: imgInfo.label
                });
                downloadCount++;
                if (downloadCount === total) {
                  wx.showToast({
                    title: "数据集下载完成",
                    icon: "success"
                  });
                  that.setData({ datasetImages: downloadedImages });
                }
              },
              fail: (err) => {
                console.error(`图片 ${imgInfo.name} 保存失败`, err);
                downloadCount++;
                if (downloadCount === total) {
                  wx.showToast({
                    title: "数据集下载完成",
                    icon: "success"
                  });
                  that.setData({ datasetImages: downloadedImages });
                }
              }
            });
          } else {
            console.error(`图片 ${imgInfo.name} 下载失败，状态码：`, res.statusCode);
            downloadCount++;
            if (downloadCount === total) {
              wx.showToast({
                title: "数据集下载完成",
                icon: "success"
              });
              that.setData({ datasetImages: downloadedImages });
            }
          }
        },
        fail: (err) => {
          console.error(`图片 ${imgInfo.name} 下载失败`, err);
          downloadCount++;
          if (downloadCount === total) {
            wx.showToast({
              title: "数据集下载完成",
              icon: "success"
            });
            that.setData({ datasetImages: downloadedImages });
          }
        }
      });
    });
  },

  // 点击“下载加载模型”按钮时调用
  downloadModel: function () {
    // 模型文件的下载地址（此处使用 CDN 地址作为示例）
    const modelUrl = "https://hub.fnas64.xin/https://hub.fnas64.xin/https://raw.githubusercontent.com/fengwm64/miniprogram-ai-eva/main/model//Users/fwm/Library/best_mobilenet_v3_20250215_acc_0.99.onnx";
    const fileManager = wx.getFileSystemManager();
    const modelPath = `${wx.env.USER_DATA_PATH}/mobilenetv3.onnx`;
    const that = this;

    wx.downloadFile({
      url: modelUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          console.log("模型文件下载成功", res.tempFilePath);
          // 直接将模型保存到指定路径
          fileManager.saveFile({
            tempFilePath: res.tempFilePath,
            filePath: modelPath,
            success: (saveRes) => {
              console.log("模型文件保存成功:", saveRes.savedFilePath);
              that.setData({ modelPath: saveRes.savedFilePath });
              wx.showToast({
                title: "模型下载成功",
                icon: "success"
              });
            },
            fail: (err) => {
              console.error("模型文件保存失败", err);
            }
          });
        } else {
          console.error("模型文件下载失败，状态码：", res.statusCode);
        }
      },
      fail: (err) => {
        console.error("下载模型文件失败", err);
      }
    });
  }
});
