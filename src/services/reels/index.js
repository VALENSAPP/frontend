import axiosInstance from "..";

export const getAllReels = async (params = {}) => {
    if (Object.keys(params).length === 0) {
        return axiosInstance.get('post/getAllReel');
    }
    return axiosInstance.get('post/getAllReel', { params });
}
