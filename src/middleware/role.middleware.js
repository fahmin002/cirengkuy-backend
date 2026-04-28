export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Akses ditolak: Hanya admin yang dapat mengakses resource ini'
        });
    } 
    next();
};
