package com.btalk.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.btalk.entity.Call;

@Repository
public interface CallRepository extends JpaRepository<Call,String>{

}
