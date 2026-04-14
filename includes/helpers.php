<?php
// Helper function to check permissions
function hasPermission($module, $action) {
    session_start();
    if (!isset($_SESSION['permissions'])) {
        return false;
    }
    $permissions = $_SESSION['permissions'];
    return isset($permissions[$module][$action]) && $permissions[$module][$action];
}
?>