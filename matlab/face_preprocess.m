%% 任务一：人像预处理与配准（修正版）
%
%  改进说明：
%  1. 消除黑边：通过 transformPointsInverse 计算输出画布四角映射回源图的
%               坐标，按需添加 'replicate' 填充，保证所有输出像素都有内容。
%  2. 统一尺寸：OUTPUT_SIZE 为固定常量，不依赖任何基准图的尺寸。
%  3. 无法检测时：用 center_crop_resize 居中裁剪并缩放，保证长宽比一致且无黑边。

%% ---- 0. 全局参数（按需修改）----
INPUT_DIR   = 'D:\Linear_algebra\Face\Face_old\';
OUTPUT_SIZE = [128, 128];   % 统一输出尺寸 [height, width]

% 目标眼睛在输出图中的归一化位置
%   左眼：宽度 30%，右眼：宽度 70%，高度：35%
EYE_X_L = 0.30;
EYE_X_R = 0.70;
EYE_Y   = 0.35;

%% ---- 1. 创建检测器 ----
eyeDetector                = vision.CascadeObjectDetector('EyePairBig');
eyeDetector.MinSize        = [11, 45];
eyeDetector.MergeThreshold = 3;

faceDetector = vision.CascadeObjectDetector();

%% ---- 2. 批量读取、灰度化、高斯滤波 ----
file_list   = dir(fullfile(INPUT_DIR, '*.jpg'));
n           = length(file_list);
gray_images = cell(1, n);
valid_count = 0;

for i = 1:n
    fp = fullfile(file_list(i).folder, file_list(i).name);
    try
        img = imread(fp);
        if size(img, 3) < 3
            fprintf('⚠️  跳过非彩色图: %s\n', file_list(i).name);
            continue;
        end
        valid_count = valid_count + 1;
        gray = uint8(0.299*double(img(:,:,1)) + ...
                     0.587*double(img(:,:,2)) + ...
                     0.114*double(img(:,:,3)));
        gray_images{valid_count} = imgaussfilt(gray, 1.0);
        fprintf('✅ 读取: %s\n', file_list(i).name);
    catch e
        fprintf('❌ 跳过损坏图片: %s (%s)\n', file_list(i).name, e.message);
    end
end

gray_images = gray_images(1:valid_count);
fprintf('\n共成功读取 %d / %d 张图片\n\n', valid_count, n);

%% ---- 3. 批量配准 ----
aligned_images = cell(1, valid_count);
%   align_status: 1 = 眼睛检测成功
%                 2 = 人脸框估算眼睛
%                 0 = 无法检测，居中裁剪
align_status   = zeros(1, valid_count);

for i = 1:valid_count
    img       = gray_images{i};
    left_eye  = [];
    right_eye = [];

    % --- 优先：眼睛对检测器 ---
    try
        eb = step(eyeDetector, img);
        if ~isempty(eb)
            eb        = eb(1, :);
            left_eye  = [eb(1) + eb(3)*0.25,  eb(2) + eb(4)*0.5];
            right_eye = [eb(1) + eb(3)*0.75,  eb(2) + eb(4)*0.5];
            align_status(i) = 1;
        end
    catch
    end

    % --- 回退：用人脸框估算眼睛位置 ---
    if isempty(left_eye)
        try
            fb = step(faceDetector, img);
            if ~isempty(fb)
                fb        = fb(1, :);
                left_eye  = [fb(1) + fb(3)*0.30,  fb(2) + fb(4)*0.35];
                right_eye = [fb(1) + fb(3)*0.70,  fb(2) + fb(4)*0.35];
                align_status(i) = 2;
                fprintf('⚠️  #%d 用人脸框估算眼睛位置\n', i);
            end
        catch
        end
    end

    % --- 都失败：居中裁剪到统一尺寸（无黑边兜底）---
    if isempty(left_eye)
        fprintf('❌ #%d 未检测到人脸/眼睛，居中裁剪\n', i);
        aligned_images{i} = center_crop_resize(img, OUTPUT_SIZE);
        % align_status(i) 保持 0
        continue;
    end

    % 眼距过小视为异常，同样走裁剪兜底
    if norm(right_eye - left_eye) < 3
        fprintf('❌ #%d 眼距异常，居中裁剪\n', i);
        aligned_images{i} = center_crop_resize(img, OUTPUT_SIZE);
        align_status(i) = 0;
        continue;
    end

    % --- 相似变换配准（无黑边）---
    aligned_images{i} = align_face_no_border( ...
        img, left_eye, right_eye, OUTPUT_SIZE, EYE_X_L, EYE_X_R, EYE_Y);

    if align_status(i) == 1
        fprintf('✅ #%d 眼睛配准完成\n', i);
    end
end

fprintf('\n====== 配准统计 ======\n');
fprintf('眼睛对齐:  %d 张\n', sum(align_status == 1));
fprintf('人脸估算:  %d 张\n', sum(align_status == 2));
fprintf('仅裁剪:    %d 张\n', sum(align_status == 0));
fprintf('总计:      %d 张\n', valid_count);

%% ---- 4. 分页显示配准结果 ----
cols     = 6;
rows     = 4;
per_page = cols * rows;
total_pages = ceil(valid_count / per_page);

for page = 1:total_pages
    si = (page - 1)*per_page + 1;
    ei = min(page*per_page, valid_count);

    figure('Name', sprintf('配准结果 第%d/%d页 (图片%d~%d)', page, total_pages, si, ei), ...
           'NumberTitle', 'off');

    for j = 1:(ei - si + 1)
        idx = si + j - 1;
        subplot(rows, cols, j);
        imshow(aligned_images{idx});

        % 标题颜色：绿=成功 黄=估算 红=失败
        c_map = {'r', 'y', 'g'};
        c = c_map{align_status(idx) + 1};
        title(sprintf('#%d', idx), 'FontSize', 7, 'Color', c);
    end
end

%% ======== 局部函数 ========

function aligned = align_face_no_border(gray_img, left_eye, right_eye, ...
                                         output_size, eye_x_l, eye_x_r, eye_y)
% 相似变换（旋转 + 缩放 + 平移）人脸配准，自动添加 replicate 填充消除黑边。
%
% 原理：
%   1. 计算将源图眼睛映射到目标坐标所需的仿射矩阵 tform（前向：源→输出）。
%   2. 用 transformPointsInverse 求输出画布四角对应的源图坐标。
%   3. 若源图坐标越界，用 'replicate' 填充（复制边缘像素，非黑色）。
%   4. 为填充后图像修正平移量，再执行 imwarp。

[src_h, src_w] = size(gray_img);

% 目标眼睛坐标（像素）
tgt_L      = [eye_x_l * output_size(2),  eye_y * output_size(1)];
tgt_R      = [eye_x_r * output_size(2),  eye_y * output_size(1)];
tgt_center = (tgt_L + tgt_R) / 2;
tgt_dist   = norm(tgt_R - tgt_L);   % 目标眼距

% 源图眼睛参数
src_dist   = norm(right_eye - left_eye);
src_center = (left_eye + right_eye) / 2;
src_angle  = atan2d(right_eye(2) - left_eye(2), right_eye(1) - left_eye(1));

% 旋转角度（将眼睛转为水平）和缩放比例
scale        = tgt_dist / src_dist;
rotate_angle = -src_angle;   % 目标角度 = 0（水平）
cos_a = cosd(rotate_angle);
sin_a = sind(rotate_angle);

% 平移量：使 src_center 映射到 tgt_center
% 前向变换：x_out = scale*cos_a*u - scale*sin_a*v + tx
%           y_out = scale*sin_a*u + scale*cos_a*v + ty
tx = tgt_center(1) - scale * (cos_a*src_center(1) - sin_a*src_center(2));
ty = tgt_center(2) - scale * (sin_a*src_center(1) + cos_a*src_center(2));

tform = affine2d([scale*cos_a,   scale*sin_a,  0; ...
                 -scale*sin_a,   scale*cos_a,  0; ...
                  tx,            ty,           1]);

% --- 计算输出画布四角在源图中对应的坐标 ---
out_corners = [1,              1; ...
               output_size(2), 1; ...
               1,              output_size(1); ...
               output_size(2), output_size(1)];
src_corners = transformPointsInverse(tform, out_corners);

% 计算需要的 padding（各方向越界量取最大值，+2 为安全余量）
pad = ceil(max(0, max([ ...
    1      - min(src_corners(:,1)), ...   % 左侧越界
    max(src_corners(:,1)) - src_w,  ...   % 右侧越界
    1      - min(src_corners(:,2)), ...   % 上侧越界
    max(src_corners(:,2)) - src_h]))) + 2;

if pad > 0
    % 用 replicate 填充（复制边缘像素，避免黑边）
    padded = padarray(gray_img, [pad, pad], 'replicate', 'both');

    % 填充后坐标 = 原坐标 + pad，修正平移量：
    % x_out = scale*cos_a*(u_p - pad) - scale*sin_a*(v_p - pad) + tx
    %       = scale*cos_a*u_p - scale*sin_a*v_p + tx - scale*pad*(cos_a - sin_a)
    tx_p = tx - scale * pad * (cos_a - sin_a);
    ty_p = ty - scale * pad * (sin_a + cos_a);

    tform_p = affine2d([scale*cos_a,   scale*sin_a,  0; ...
                       -scale*sin_a,   scale*cos_a,  0; ...
                        tx_p,          ty_p,         1]);
else
    padded  = gray_img;
    tform_p = tform;
end

ref_view = imref2d(output_size);
aligned  = imwarp(padded, tform_p, 'OutputView', ref_view, 'FillValues', 0);
end


function out = center_crop_resize(img, out_size)
% 居中裁剪为与 out_size 相同的长宽比，再缩放到 out_size，保证无黑边。
[h, w]    = size(img);
tgt_ratio = out_size(2) / out_size(1);   % width / height
src_ratio = w / h;

if src_ratio > tgt_ratio
    % 图像偏宽：裁左右
    new_w = round(h * tgt_ratio);
    x0    = floor((w - new_w) / 2) + 1;
    img   = img(:, x0 : x0 + new_w - 1);
else
    % 图像偏高：裁上下
    new_h = round(w / tgt_ratio);
    y0    = floor((h - new_h) / 2) + 1;
    img   = img(y0 : y0 + new_h - 1, :);
end

out = imresize(img, out_size);
end
