use crate::errors::ErrorCode;

pub fn get_withdraw_amounts(fee_basis_points: u16, price: u32) -> Result<(u64, u64), ErrorCode> {
    let total_fee = (fee_basis_points as u128)
        .checked_mul(price as u128)
        .ok_or(ErrorCode::NumericalOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;
    let seller_amount = (price as u64)
        .checked_sub(total_fee)
        .ok_or(ErrorCode::NumericalOverflow)? as u64;

    Ok((total_fee, seller_amount))
}

pub fn get_64_bytes_from_string(string: String) -> Result<[u8; 64], ErrorCode> {
    // The reason for creating a fixed-length byte array is to ensure that the resulting array always has a consistent size, 
    // regardless of the length of the original string. If the app_name string is shorter than 32 characters, the remaining 
    // bytes in the name_data array will be filled with whitespace characters. If the app_name string is longer than 32 
    // characters, will throw an error. The unique string will be the id to be able to use it easily as a seed, it's at the end to
    // no get problems
    let bytes = string.as_bytes();
    if bytes.len() > 64 {
        return Err(ErrorCode::StringTooLong.into());
    }
    let mut data = [b' '; 64];
    data[..bytes.len()].copy_from_slice(bytes);

    return Ok(data);
}

pub fn get_32_bytes_from_string(string: String) -> Result<[u8; 32], ErrorCode> {
    let bytes = string.as_bytes();
    if bytes.len() > 32 {
        return Err(ErrorCode::StringTooLong.into());
    }
    let mut data = [b' '; 32];
    data[..bytes.len()].copy_from_slice(bytes);

    return Ok(data);
}