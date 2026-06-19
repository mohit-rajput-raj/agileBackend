export const table = async()=>{
    const {profile} = req.user;
    try {
        
        
    } catch (error) {
        
        console.error(error.msg);
        
        return res.status(500).json({msg:error});
    }
}