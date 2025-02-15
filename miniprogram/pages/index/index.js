// index.js
Page({
  data: {
    // 存放解析后的 JSON 数据（标签和图片信息）
    datasetLabels: {},
    // 存放下载后的图片信息（包含本地路径、名称、标签等）
    datasetImages: []
  },

  // 点击“下载评测数据集”按钮时调用
  downloadDataset: function() {
    const datasetUrl = "https://hub.fnas64.xin/dataset/labels.json";
    const fileManager = wx.getFileSystemManager();
    const labelsPath = `${wx.env.USER_DATA_PATH}/labels.json`;
    const that = this;
    
    // 下载 JSON 数据集文件
    wx.downloadFile({
      url: datasetUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          console.log("labels.json 下载成功", res.tempFilePath);
          // 将临时文件保存到本地指定路径
          fileManager.writeFile({
            filePath: labelsPath,
            data: res.data,
            encoding: "utf8",
            success: () => {
              console.log("标签文件写入成功", labelsPath);
              // 读取并解析 JSON 文件
              fileManager.readFile({
                filePath: labelsPath,
                encoding: "utf8",
                success: (readRes) => {
                  let dataset = JSON.parse(readRes.data);
                  console.log("解析后的数据集：", dataset);
                  that.setData({ datasetLabels: dataset });
                  // 开始下载 JSON 文件中列出的所有图片
                  that.downloadImages(dataset.images);
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
  downloadImages: function(images) {
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
            // 为避免目录结构问题，保存时将原始路径中的斜杠替换为下划线，例如 "0/cat.jpg" => "0_cat.jpg"
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
  }
});
